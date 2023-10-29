(function() {
    var iframe = __$_.player.getIframe().contentWindow.document
    var hiding_info_style = iframe.createElement('style');

    hiding_info_style.innerHTML = `
        .ytp-title,
        .ytp-watch-later-button,
        .ytp-chrome-top-buttons,
        .ytp-pause-overlay {
            display: none !important;
        }
    `;

    iframe.head.appendChild(hiding_info_style);
})();
