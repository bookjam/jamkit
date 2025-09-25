export default function sleep(time: number): void {
    const start = Date.now();

    while (true) {
        if (Date.now() > start + time) {
            break;
        }
    }
}