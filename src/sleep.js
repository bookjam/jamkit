export default function sleep(time) {
    const start = Date.now();

    while (true) {
        if (Date.now() > start + time) {
            break;
        }
    }
}
