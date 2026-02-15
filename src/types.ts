export interface AppInfo {
    id: string;
    version?: string;
    title?: string;
    localization?: {
        [language: string]: {
            title?: string;
        };
    };
    [key: string]: any;
}

export interface BookInfo {
    id: string;
    version?: string;
    title?: string;
    [key: string]: any;
}
