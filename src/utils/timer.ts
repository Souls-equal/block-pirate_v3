// utils/timer.ts  —  Scheduler par ticks (setTimeout / setInterval / coroutines)

type TimerHandle = {
    stop: () => void;
};

type Timer = {
    fn: () => void;
    t: number;
    i: number;
    active: boolean;
    failures: number;
    logged: number;
};

type Wait =
    | { t: number }
    | { fn: () => boolean };

type GeneratorResult = {
    value?: Wait | void;
    done: boolean;
};

type CoroutineGenerator = {
    next: () => GeneratorResult;
};

type Coroutine = {
    gen: CoroutineGenerator;
    wait: number;
    cond: (() => boolean) | null;
};

let time = 0;
const timers: Timer[] = [];
const coroutines: Coroutine[] = [];

// un callback qui throw est arrêté après ce nombre d'échecs consécutifs
const MAX_FAILURES = 4;
// nombre max de logs par timer (anti-flood)
const MAX_LOGS = 3;

// log sécurisé : ne throw JAMAIS, même si api.log casse.
function logError(tag: string, e: unknown) {
    const msg = (e && ((e as any).message || e)) || "unknown error";
    try { api.log("[" + tag + "] " + msg); } catch (e2) {}
}

export function setTimeout(fn: () => void, delay: number): TimerHandle {
    if (delay < 0) delay = 0;

    const timer: Timer = {
        fn: fn,
        t: time + delay,
        i: 0,
        active: true,
        failures: 0,
        logged: 0
    };

    timers.push(timer);

    return {
        stop: () => {
            timer.active = false;
        }
    };
}

export function setInterval(fn: () => void, interval: number): TimerHandle {
    if (interval < 1) interval = 1;

    const timer: Timer = {
        fn: fn,
        t: time + interval,
        i: interval,
        active: true,
        failures: 0,
        logged: 0
    };

    timers.push(timer);

    return {
        stop: () => {
            timer.active = false;
        }
    };
}

export function sleep(t: number): Wait {
    if (t < 0) t = 0;
    return { t: t };
}

export function until(fn: () => boolean): Wait {
    return { fn: fn };
}

export function run(gen: CoroutineGenerator): void {
    coroutines.push({
        gen: gen,
        wait: time,
        cond: null
    });
}

export function step(): void {
    time++;

    for (let i = timers.length - 1; i >= 0; i--) {
        const timer = timers[i];

        if (!timer.active) {
            timers.splice(i, 1);
            continue;
        }

        if (time < timer.t) continue;

        // Isolé : une exception ici n'empêche PAS les timers suivants de tourner.
        let threw = false;
        try {
            timer.fn();
        } catch (e) {
            threw = true;
            timer.failures++;
            if (timer.logged < MAX_LOGS) {
                timer.logged++;
                logError("Timer error", e);
            }
        }

        // Après trop d'échecs, on arrête proprement le timer pour ne pas le
        // laisser tourner à vide (DoT sur une cible déjà morte, etc.).
        if (timer.failures > MAX_FAILURES) {
            timer.active = false;
            timers.splice(i, 1);
            continue;
        }

        if (!timer.active || timer.i === 0) {
            timers.splice(i, 1);
        } else {
            // même si le callback a throw, un interval continue normalement :
            // la cible peut être revenue, et on ne bloque pas les prochains ticks.
            timer.t = time + timer.i;
            if (threw) {
                // on laisse tourner, mais on ne compte plus ce tick comme "fréquent".
            }
        }
    }

    for (let i = coroutines.length - 1; i >= 0; i--) {
        const c = coroutines[i];

        if (c.wait > time) continue;
        if (c.cond && !c.cond()) continue;

        let r: GeneratorResult;

        try {
            r = c.gen.next();
        } catch (e) {
            logError("Coroutine error", e);
            coroutines.splice(i, 1);
            continue;
        }

        if (r.done) {
            coroutines.splice(i, 1);
            continue;
        }

        const v = r.value;

        if (!v) {
            c.wait = time;
            c.cond = null;
        } else if ("t" in v) {
            c.wait = time + v.t;
            c.cond = null;
        } else {
            c.wait = time;
            c.cond = v.fn;
        }
    }
}
