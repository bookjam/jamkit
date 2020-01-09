var hiding_info_style = document.createElement('style');

hiding_info_style.innerHTML = `
    .ytp-title {
        display: none !important;
    }
`;

document.head.appendChild(hiding_info_style);
