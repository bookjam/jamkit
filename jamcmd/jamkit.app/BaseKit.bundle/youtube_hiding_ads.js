var hiding_ads_style = document.createElement('style');

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
    .ytp-ad-progress-list,
    #masthead-ad,
    #player-ads {
        display: none !important;
    }
`;

document.head.appendChild(hiding_ads_style);
