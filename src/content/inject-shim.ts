const script = document.createElement('script')
script.src = chrome.runtime.getURL('inject.js')
script.type = 'text/javascript'
script.dataset.wdkWallet = 'true'

;(document.head || document.documentElement).appendChild(script)
script.remove()
