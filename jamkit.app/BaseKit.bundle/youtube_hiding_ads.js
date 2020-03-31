(function() {
    var iframe = __$_.player.getIframe().contentWindow.document
    var hiding_ads_style = iframe.createElement('style');

    hiding_ads_style.innerHTML = `
        .ad-container,
        .ad-div,
        .masthead-ad-control,
        .video-ads,
        .ytp-ad-progress-list,
        #ad_creative_3,
        #footer-ads,
        #masthead-ad,
        #player-ads,
        .ytd-mealbar-promo-renderer,
        #watch-channel-brand-div,
        #watch7-sidebar-ads {
            display: none !important;
        }
    `;

    iframe.head.appendChild(hiding_ads_style);
})()
