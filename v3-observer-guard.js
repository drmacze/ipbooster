(() => {
  'use strict';
  const NativeObserver=window.MutationObserver;
  if(!NativeObserver||window.__ipboosterObserverGuard)return;
  window.__ipboosterObserverGuard=true;

  function ignored(target){
    if(!(target instanceof Element))return false;
    return Boolean(target.closest('#v3Control,#v3RouterCard,#v3Analytics,#v3GameDialog,#v3PreflightDialog,#v3RouterDialog,#v3PostDialog,#v3SettingsDialog')||target.matches('.version-chip,#readinessText'));
  }

  function GuardedMutationObserver(callback){
    return new NativeObserver((records,observer)=>{
      const meaningful=records.filter(record=>!ignored(record.target));
      if(meaningful.length)callback(meaningful,observer);
    });
  }
  GuardedMutationObserver.prototype=NativeObserver.prototype;
  Object.setPrototypeOf(GuardedMutationObserver,NativeObserver);
  window.MutationObserver=GuardedMutationObserver;
})();
