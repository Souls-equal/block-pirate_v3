/* ============================================================
   CREATION (Manifest Golem)
   1 fruit = 1 Code Block. Ne PAS modifier la 1re et la derniere ligne.
   ============================================================ */
(FA=>{/* Code Block fruits — colle ce fichier TEL QUEL dans UN Code Block du monde. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
/* CREATION — Manifest Golem — FIX XP */
const MG_TYPE = "Spirit Golem", MG_TTL = 480, MG_PICK = 80, MG_TICK = 2, MG_SEEK = 34;
const MG_SHARE = 0.5, MG_BASE_HIT = 18, MG_MIN_HP = 20;
const MG_FOLLOW = 16, MG_MINF = 4, MG_CHASE = 45, MG_RETRY = 8;
const MG_MARK = 3, MG_GLOW = 10, MG_RISE = 12, MG_LEASH = 10, MG_CHEST = 1.2;
const MG_STONE = [170, 180, 200], MG_LIT = [140, 235, 255], MG_WHITE = [255, 255, 255];
const createdGolems = {};

function mg_maxHp(pid) {
    let hp = 0;
    try { hp = api.getMaxHealth ? api.getMaxHealth(pid) : 0 } catch (e) { hp = 0 }
    if (!(hp > 0)) { try { hp = Number(api.getClientOption(pid, "maxHealth")) || 0 } catch (e2) { hp = 0 } }
    if (!(hp > 0)) hp = 100;
    return hp;
}

function mg_stats(pid) {
    let mult = 1;
    try { mult = strengthMult(pid) || 1 } catch (e) { mult = 1 }
    return {
        hp: Math.max(MG_MIN_HP, Math.round(mg_maxHp(pid) * MG_SHARE)),
        dmg: Math.max(2, Math.round(MG_BASE_HIT * mult * MG_SHARE))
    };
}

function mg_free(q) {
    const x = Math.floor(q[0]), y = Math.floor(q[1]), z = Math.floor(q[2]);
    if (isSolid(x, y, z) || isSolid(x, y + 1, z)) return false;
    return isSolid(x, y - 1, z);
}

function mg_flat(pid) {
    const d = facing(pid);
    const l = Math.sqrt(d[0] * d[0] + d[2] * d[2]);
    return l < 1e-4 ? [0, 1] : [d[0] / l, d[2] / l];
}

function mg_spot(pid) {
    const p = posOf(pid);
    if (!p) return null;
    const f = mg_flat(pid);
    const cands = [[p[0] + f[0] * 2.2, p[1], p[2] + f[1] * 2.2]];
    for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        cands.push([p[0] + Math.cos(a) * 1.6, p[1], p[2] + Math.sin(a) * 1.6]);
    }
    for (let i = 0; i < cands.length; i++) if (mg_free(cands[i])) return cands[i];
    return cands[0];
}

function mg_live(mob) {
    if (!mob) return false;
    let ids = [];
    try { ids = api.getMobIds() || [] } catch (e) { return false }
    for (let i = 0; i < ids.length; i++) if (ids[i] === mob) return isAliveId(mob);
    return false;
}

function mg_isMine(id) {
    for (const k in createdGolems) if (createdGolems[k].mob === id) return true;
    return false;
}

function mg_configure(mob, pid) {
    const s = mg_stats(pid);
    let nm = null;
    try { nm = api.getEntityName(pid) } catch (e0) {}
    function set(k, v) { try { api.setMobSetting(mob, k, v) } catch (e) {} }
    set("hostilityRadius", 0);
    set("chaseRadius", MG_CHASE);
    set("minFollowingRadius", MG_MINF);
    set("maxFollowingRadius", MG_FOLLOW);
    set("initialHealth", s.hp); set("maxHealth", s.hp);
    /* FIX: vanilla attackDamage à 0, on gère dégâts nous-même via damage() pour créditer XP */
    set("attackDamage", 0);
    set("healthRegen", { amount: 4, interval: 2.5, startAfter: 5 });
    set("isRideable", false);
    set("name", (nm || "Creation") + "'s creation");
    try { api.setMobSetting(mob, "ownerDbId", api.getPlayerDbId(pid)) } catch (e1) {}
    return s;
}

function mg_nearest(st) {
    const o = posOf(st.pid);
    if (!o) return null;
    const ids = [];
    try { ids.push.apply(ids, api.getPlayerIds() || []) } catch (e) {}
    try { ids.push.apply(ids, api.getMobIds() || []) } catch (e2) {}
    let best = null, bd = MG_SEEK * MG_SEEK;
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (id === st.pid || !isAliveId(id) || mg_isMine(id)) continue;
        try { if (api.getEntityType(id) === "NPC") continue } catch (e3) {}
        const q = posOf(id);
        if (!q) continue;
        const dx = q[0] - o[0], dy = q[1] - o[1], dz = q[2] - o[2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < bd) { bd = d2; best = id }
    }
    return best;
}

function mg_pick(st) {
    const t = mg_nearest(st);
    try { api.passifyHostility(st.mob, st.pid) } catch (e0) {}
    const s = mg_stats(st.pid);
    if (s.hp !== st.hp) {
        st.hp = s.hp;
        try { api.setMobSetting(st.mob, "maxHealth", s.hp) } catch (e4) {}
    }
    if (s.dmg !== st.dmg) {
        st.dmg = s.dmg;
    }
    if (t) {
        if (t !== st.target) { st.target = t; st.mark = MG_MARK }
        try { api.setMobAiState(st.mob, "chasing", { targetId: t }) } catch (e1) {}
    } else {
        st.target = null;
        try { api.setMobAiState(st.mob, "following", { targetId: st.pid }) } catch (e2) {}
    }
}

function mg_grain(p, r, col, up, life, n) {
    point(p, {
        r: r, tex: (n % 2) ? TEX.glint : TEX.square, count: 1,
        life: [life * 0.6, life], power: [0.2, 1.2], size: [0.16, 0.42],
        gravity: [0, up < 0 ? -2.4 : 0.9, 0], dir: [0, up, 0], dirSpread: 0.4,
        colors: [[[col[0], col[1], col[2], 0.95], MG_WHITE],
                 [[MG_STONE[0], MG_STONE[1], MG_STONE[2], 0], [col[0], col[1], col[2], 0]]],
    });
}

function mg_bornFx(st) {
    for (let i = 0; i < MG_RISE; i++) {
        const a = i * GOLDEN;
        mg_grain([st.x + Math.cos(a) * 0.7, st.y + 0.3 + i * 0.16, st.z + Math.sin(a) * 0.7], 0.24, MG_LIT, 1.4, 0.6, i);
    }
    for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        mg_grain([st.x + Math.cos(a) * 1.5, st.y + 0.05, st.z + Math.sin(a) * 1.5], 0.3, MG_STONE, 0.5, 0.5, i);
    }
}

function mg_leashFx(st) {
    const a = posOf(st.mob), b = st.target ? posOf(st.target) : null;
    if (!a || !b) return;
    st.px = a[0]; st.py = a[1]; st.pz = a[2];
    for (let i = 0; i < MG_LEASH; i++) {
        const f = i / (MG_LEASH - 1);
        mg_grain([a[0] + (b[0] - a[0]) * f, a[1] + MG_CHEST + (b[1] + 1 - a[1] - MG_CHEST) * f,
                  a[2] + (b[2] - a[2]) * f], 0.18, (i % 2) ? MG_LIT : MG_WHITE, 0.2, 0.35, i);
    }
    for (let i = 0; i < 6; i++) {
        const g = i * 1.0472;
        mg_grain([b[0] + Math.cos(g) * 0.8, b[1] + 0.05, b[2] + Math.sin(g) * 0.8], 0.26, MG_LIT, 1.1, 0.45, i);
    }
}

function mg_glowFx(st) {
    const a = posOf(st.mob);
    if (!a) return;
    st.px = a[0]; st.py = a[1]; st.pz = a[2];
    for (let i = 0; i < 4; i++) {
        mg_grain([a[0] + Math.cos(st.t * 0.2 + i * 1.57) * 0.6, a[1] + 0.6 + i * 0.5,
                  a[2] + Math.sin(st.t * 0.2 + i * 1.57) * 0.6], 0.2, MG_STONE, 0.9, 0.5, i);
    }
}

function mg_dust(st, n) {
    if (st.px === undefined) return;
    for (let i = 0; i < n; i++) {
        const a = i * GOLDEN, k = 0.4 + (i % 4) * 0.28;
        mg_grain([st.px + Math.cos(a) * k, st.py + 0.5 + (i % 5) * 0.45, st.pz + Math.sin(a) * k],
            0.28, (i % 3) ? MG_STONE : MG_LIT, -0.6, 0.9, i);
    }
}

function mg_spawn(st) {
    const q = mg_spot(st.pid);
    if (!q) return;
    let mob = null;
    try {
        mob = api.attemptSpawnMob(MG_TYPE, q[0], q[1], q[2], { spawnerId: st.pid, variation: "default", playSoundOnSpawn: false });
    } catch (e) { mob = null }
    if (!mob) {
        st.tries++;
        if (st.tries >= MG_RETRY) st.dead = 1;
        return;
    }
    st.mob = mob; st.x = q[0]; st.y = q[1]; st.z = q[2];
    st.px = q[0]; st.py = q[1]; st.pz = q[2];
    const s = mg_configure(mob, st.pid);
    st.hp = s.hp; st.dmg = s.dmg;
    claimSummon(mob, st.pid);
    mg_pick(st);
    sound.at(st.pid, "cannonFire3", 0.8, 0.55, 26);
    mg_bornFx(st);
}

function mg_end(pid, st) {
    if (!st) return false;
    if (st.mob) {
        freeSummon(st.mob);
        try { api.despawnMob(st.mob) } catch (e) {}
    }
    st.mob = null;
    if (createdGolems[pid] === st) delete createdGolems[pid];
    return true;
}

function mg_co(st) {
    return { next: function () {
        if (createdGolems[st.pid] !== st) return { done: true };
        if (!isAliveId(st.pid)) { mg_end(st.pid, st); return { done: true } }
        st.t += MG_TICK;
        if (!st.mob) {
            if (!st.tries || st.t % 10 === 0) mg_spawn(st);
            if (st.dead) { mg_end(st.pid, st); return { done: true } }
        } else if (!mg_live(st.mob)) {
            mg_dust(st, 10); mg_end(st.pid, st); return { done: true }
        } else {
            try {
                if (st.mark > 0) { st.mark--; mg_leashFx(st) }
                if (st.t % MG_GLOW === 0) mg_glowFx(st);
                if (st.t % MG_PICK === 0) mg_pick(st);
                /* FIX XP: le golem tape lui-même via damage() avec le joueur comme caster */
                if (st.target && isAliveId(st.target)) {
                    const mp = posOf(st.mob);
                    const tp = posOf(st.target);
                    if (mp && tp) {
                        const dx = mp[0]-tp[0], dy = mp[1]-tp[1], dz = mp[2]-tp[2];
                        const d2 = dx*dx+dy*dy+dz*dz;
                        if (d2 < 6.5) {
                            if (st.t % 12 === 0) {
                                try { damage(st.target, st.dmg, st.pid, "Golem"); } catch (e) {}
                            }
                        }
                    }
                }
                if (st.t >= MG_TTL) { mg_dust(st, 16); mg_end(st.pid, st); return { done: true } }
            } catch (e) {}
        }
        return { value: sleep(MG_TICK), done: false };
    } };
}

function onPlayerClickManifestGolem(pid, itemName) {
    if (!isAliveId(pid)) return false;
    if (createdGolems[pid]) return true;
    if (!posOf(pid)) return true;
    const st = { pid: pid, item: itemName, t: 0, mob: null, target: null, mark: 0, tries: 0, dead: 0, hp: 0, dmg: 0 };
    createdGolems[pid] = st;
    sound.at(pid, "cannonFire3", 0.45, 1.9, 18);
    run(mg_co(st));
    setTimeout(function () { mg_end(pid, st) }, MG_TTL + 40);
    return true;
}

function onCancelCreation(pid) { return mg_end(pid, createdGolems[pid]) }
function onPlayerLeaveCreation(pid) { onCancelCreation(pid) }


Object.assign(R,{onPlayerClickManifestGolem,onCancelCreation,onPlayerLeaveCreation});
})(globalThis.FA);
