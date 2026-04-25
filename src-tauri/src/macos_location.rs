// macOS CoreLocation wrapper exposed as a Tauri command.
//
// Reason: tauri-plugin-geolocation does not support macOS desktop
// (iOS/Android only). Without a native CoreLocation call the app
// never registers in System Settings -> Privacy & Security ->
// Location Services, and `navigator.geolocation` does not work in
// WKWebView.

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;

use objc2::rc::Retained;
use objc2::runtime::ProtocolObject;
use objc2::{define_class, msg_send, AllocAnyThread, DefinedClass};
use objc2_core_location::{
    CLLocation, CLLocationManager, CLLocationManagerDelegate,
};
use objc2_foundation::{MainThreadMarker, NSArray, NSError, NSObject, NSObjectProtocol};
use serde::Serialize;
use tokio::sync::oneshot;

#[derive(Debug, Serialize)]
pub struct LocationResult {
    pub latitude: f64,
    pub longitude: f64,
}

type Reply = oneshot::Sender<Result<LocationResult, String>>;

pub struct DelegateIvars {
    sender: Mutex<Option<Reply>>,
    // Owns the manager. Released when the delegate is dropped (i.e.
    // when the registry entry is removed on the main thread after
    // the request resolves).
    _manager: Retained<CLLocationManager>,
}

define_class!(
    #[unsafe(super(NSObject))]
    #[name = "PathfindersLocationDelegate"]
    #[ivars = DelegateIvars]
    struct Delegate;

    unsafe impl NSObjectProtocol for Delegate {}

    unsafe impl CLLocationManagerDelegate for Delegate {
        #[unsafe(method(locationManager:didUpdateLocations:))]
        fn did_update(&self, _manager: &CLLocationManager, locations: &NSArray<CLLocation>) {
            if locations.len() == 0 { return; }
            let loc = locations.objectAtIndex(locations.len() - 1);
            let coord = unsafe { loc.coordinate() };
            self.send(Ok(LocationResult { latitude: coord.latitude, longitude: coord.longitude }));
        }

        #[unsafe(method(locationManager:didFailWithError:))]
        fn did_fail(&self, _manager: &CLLocationManager, error: &NSError) {
            self.send(Err(error.localizedDescription().to_string()));
        }

        #[unsafe(method(locationManagerDidChangeAuthorization:))]
        fn did_change_auth(&self, manager: &CLLocationManager) {
            let status = unsafe { manager.authorizationStatus() };
            // 0 notDetermined: keep waiting.
            // 1 restricted, 2 denied: fail.
            // 3 authorized (macOS), 4 authorizedAlways: kick off the one-shot fix.
            match status.0 {
                0 => {}
                1 | 2 => self.send(Err("Location permission denied".to_string())),
                _ => unsafe { manager.requestLocation() },
            }
        }
    }
);

impl Delegate {
    fn new(
        _mtm: MainThreadMarker,
        sender: Reply,
        manager: Retained<CLLocationManager>,
    ) -> Retained<Self> {
        let this = Self::alloc().set_ivars(DelegateIvars {
            sender: Mutex::new(Some(sender)),
            _manager: manager,
        });
        unsafe { msg_send![super(this), init] }
    }

    fn send(&self, result: Result<LocationResult, String>) {
        if let Some(tx) = self.ivars().sender.lock().unwrap().take() {
            let _ = tx.send(result);
        }
    }
}

// In-flight requests keyed by id. Stores `Retained<Delegate>` as a
// raw pointer (usize) so the static is Send/Sync; insert and remove
// always run on the main thread, where Retained drop is safe.
static REGISTRY: OnceLock<Mutex<HashMap<u64, usize>>> = OnceLock::new();
static NEXT_ID: AtomicU64 = AtomicU64::new(1);

fn registry() -> &'static Mutex<HashMap<u64, usize>> {
    REGISTRY.get_or_init(|| Mutex::new(HashMap::new()))
}

#[tauri::command]
pub async fn get_macos_location(app: tauri::AppHandle) -> Result<LocationResult, String> {
    let (tx, rx) = oneshot::channel::<Result<LocationResult, String>>();
    let id = NEXT_ID.fetch_add(1, Ordering::Relaxed);

    app.run_on_main_thread(move || {
        let mtm = MainThreadMarker::new()
            .expect("run_on_main_thread closure must execute on the main thread");
        let manager: Retained<CLLocationManager> = unsafe { CLLocationManager::new() };
        let delegate = Delegate::new(mtm, tx, manager.clone());
        let proto: &ProtocolObject<dyn CLLocationManagerDelegate> =
            ProtocolObject::from_ref(&*delegate);
        unsafe {
            manager.setDelegate(Some(proto));
            manager.requestWhenInUseAuthorization();
        }
        let raw = Retained::into_raw(delegate) as usize;
        registry().lock().unwrap().insert(id, raw);
    })
    .map_err(|e| format!("dispatch to main thread failed: {e}"))?;

    let result = match tokio::time::timeout(Duration::from_secs(20), rx).await {
        Ok(Ok(r)) => r,
        Ok(Err(_)) => Err("delegate channel closed without value".to_string()),
        Err(_) => Err("location request timed out".to_string()),
    };

    // setDelegate is a weak reference, so the Retained must outlive
    // every callback. Release on the main thread for run-loop affinity.
    let _ = app.run_on_main_thread(move || {
        if let Some(raw) = registry().lock().unwrap().remove(&id) {
            unsafe { drop(Retained::from_raw(raw as *mut Delegate)); }
        }
    });

    result
}
