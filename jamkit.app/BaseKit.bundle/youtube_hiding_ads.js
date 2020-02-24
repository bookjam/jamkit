(function() {
    var iframe = __$_.player.getIframe().contentWindow.document
    var hiding_ads_style = iframe.createElement('style');

    hiding_ads_style.innerHTML = `
        #watch7-sidebar-ads,
        .video-ads,
        .ytp-ad-progress-list,
        #watch-channel-brand-div,
        .ad-container,
        #ad_creative_3,
        #footer-ads,
        .ad-div,
        .masthead-ad-control,
        #masthead-ad,
        #player-ads {
            display: none !important;
        }
    `;

    iframe.head.appendChild(hiding_ads_style);
})()
