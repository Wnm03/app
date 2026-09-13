from pathlib import Path
files=[Path('/mnt/data/s30/modules/shared/modal-navigasi.js'),Path('/mnt/data/s30/modules/asset/modal-navigasi.js')]
old="""function closeModal(id){\nconst el=document.getElementById(id);\nif(!el)return;\n_clearSwipeDismissCloseTimer(el);\n_clearSwipeDismissCloseTimer(el);\n"""
new="""function closeModal(id){\nconst el=document.getElementById(id);\nif(!el)return;\n_clearSwipeDismissCloseTimer(el);\nif(typeof _cleanupSwipeDismissForOverlay==='function')_cleanupSwipeDismissForOverlay(el);\n"""
for p in files:
    s=p.read_text()
    if old not in s: raise SystemExit(f'close block not found {p}')
    s=s.replace(old,new,1)
    old2="""const _swipeDismissBoundHandles=typeof WeakSet==='function'?new WeakSet():null;\nfunction enableSwipeToDismiss(overlayId){\n"""
    new2="""// S30 MODAL SWIPE LIFECYCLE HARDENING: selain idempotensi bind (S25), simpan\n// cleanup per handle supaya listener touch + window mouse ikut dilepas saat modal\n// ditutup. WeakSet saja tidak cukup: DOM handle yang sudah dilepas dari modal\n// masih bisa tertahan oleh listener window yang menangkap closure onMove/onEnd.\nconst _swipeDismissCleanupByHandle=typeof WeakMap==='function'?new WeakMap():null;\nfunction _cleanupSwipeDismissForOverlay(overlay){\nif(!overlay||!_swipeDismissCleanupByHandle)return;\nconst handle=overlay.querySelector('.modal-handle');\nif(!handle)return;\nconst cleanup=_swipeDismissCleanupByHandle.get(handle);\nif(typeof cleanup==='function')cleanup();\n}\nfunction enableSwipeToDismiss(overlayId){\n"""
    if old2 not in s: raise SystemExit(f'guard block not found {p}')
    s=s.replace(old2,new2,1)
    old3="""if(_swipeDismissBoundHandles&&_swipeDismissBoundHandles.has(handle))return;\nif(_swipeDismissBoundHandles)_swipeDismissBoundHandles.add(handle);\nconst THRESHOLD=90;\n"""
    new3="""if(_swipeDismissCleanupByHandle&&_swipeDismissCleanupByHandle.has(handle))return;\nconst THRESHOLD=90;\n"""
    if old3 not in s: raise SystemExit(f'bind guard not found {p}')
    s=s.replace(old3,new3,1)
    old4="""handle.addEventListener('mousedown',onStart);\nwindow.addEventListener('mousemove',onMove);\nwindow.addEventListener('mouseup',onEnd);\n}\n"""
    new4="""handle.addEventListener('mousedown',onStart);\nwindow.addEventListener('mousemove',onMove);\nwindow.addEventListener('mouseup',onEnd);\nif(_swipeDismissCleanupByHandle){\n  _swipeDismissCleanupByHandle.set(handle,()=>{\n    handle.removeEventListener('touchstart',onStart,{passive:true});\n    handle.removeEventListener('touchmove',onMove,{passive:true});\n    handle.removeEventListener('touchend',onEnd);\n    handle.removeEventListener('touchcancel',onEnd);\n    handle.removeEventListener('mousedown',onStart);\n    window.removeEventListener('mousemove',onMove);\n    window.removeEventListener('mouseup',onEnd);\n    _swipeDismissCleanupByHandle.delete(handle);\n    dragging=false;\n  });\n}\n}\n"""
    if old4 not in s: raise SystemExit(f'listener block not found {p}')
    s=s.replace(old4,new4,1)
    p.write_text(s)
print('patched sources')
