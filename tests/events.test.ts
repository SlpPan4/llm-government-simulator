// Базовые ивенты (7.8): условные ивенты выпадают только при выполнении when
// (стат, derived, moodBand), универсальные — всегда. Эффекты фиксированы
// в конфиге и применяет движок (engine/events.ts), LLM их не трогает.

import { describe, expect, test } from 'vitest';
import { eventEligible, eligibleEvents, applyBaseEvent, BASE_EVENTS } from '../engine/events.js';
import { makeState } from './helpers.js';

const byId = (id: string) => BASE_EVENTS.find((d) => d.id === id)!;

describe('базовые ивенты: условия выпадения (7.8)', () => {
  test('universal events are always eligible', () => {
    const s = makeState();
    for (const id of ['viral_meme', 'railway_accident', 'spy_scandal']) {
      expect(eventEligible(s, byId(id))).toBe(true);
    }
  });

  test('harvest_failure: inflation above 15 AND economy below 50', () => {
    const eligible = makeState('realism', (s) => {
      s.stats.inflation = 20; s.stats.economy = 40;
    });
    expect(eventEligible(eligible, byId('harvest_failure'))).toBe(true);
    // ровно одно из двух условий — недостаточно
    const onlyInflation = makeState('realism', (s) => { s.stats.inflation = 20; });
    expect(eventEligible(onlyInflation, byId('harvest_failure'))).toBe(false);
    const onlyWeakEconomy = makeState('realism', (s) => { s.stats.economy = 40; });
    expect(eventEligible(onlyWeakEconomy, byId('harvest_failure'))).toBe(false);
  });

  test('foreign_investment: strong economy', () => {
    expect(eventEligible(makeState(), byId('foreign_investment'))).toBe(false);
    const s = makeState('realism', (x) => { x.stats.economy = 70; });
    expect(eventEligible(s, byId('foreign_investment'))).toBe(true);
  });

  test('currency_crisis: high inflation', () => {
    expect(eventEligible(makeState(), byId('currency_crisis'))).toBe(false);
    const s = makeState('realism', (x) => { x.stats.inflation = 45; });
    expect(eventEligible(s, byId('currency_crisis'))).toBe(true);
  });

  test('epidemic: poverty above 50', () => {
    expect(eventEligible(makeState(), byId('epidemic'))).toBe(false);
    const s = makeState('realism', (x) => { x.stats.poverty = 65; });
    expect(eventEligible(s, byId('epidemic'))).toBe(true);
  });

  test('factory_closure: weak economy AND unemployment above 15', () => {
    const eligible = makeState('realism', (s) => {
      s.stats.economy = 30; s.stats.unemployment = 25;
    });
    expect(eventEligible(eligible, byId('factory_closure'))).toBe(true);
    // безработица на стартовом уровне (не выше 15) — не выпадает
    const weakOnly = makeState('realism', (s) => { s.stats.economy = 30; });
    expect(eventEligible(weakOnly, byId('factory_closure'))).toBe(false);
  });

  test('startup_boom: technology AND freedom both high', () => {
    const eligible = makeState('realism', (s) => {
      s.stats.technology = 70; s.stats.freedom = 60;
    });
    expect(eventEligible(eligible, byId('startup_boom'))).toBe(true);
    const unfree = makeState('realism', (s) => { s.stats.technology = 70; s.stats.freedom = 20; });
    expect(eventEligible(unfree, byId('startup_boom'))).toBe(false);
  });

  test('pensioner_march: workers in disliking band or worse', () => {
    expect(eventEligible(makeState(), byId('pensioner_march'))).toBe(false);
    const angry = makeState('realism', (s) => { s.mood.workers = 30; }); // disliking 20..39
    expect(eventEligible(angry, byId('pensioner_march'))).toBe(true);
    const furious = makeState('realism', (s) => { s.mood.workers = 5; }); // hatred
    expect(eventEligible(furious, byId('pensioner_march'))).toBe(true);
  });

  test('expo_forum: stability above 55', () => {
    expect(eventEligible(makeState(), byId('expo_forum'))).toBe(true); // start 65
    const shaky = makeState('realism', (s) => { s.stats.stability = 40; });
    expect(eventEligible(shaky, byId('expo_forum'))).toBe(false);
  });

  test('oligarch_lobby: corruption above 40', () => {
    expect(eventEligible(makeState(), byId('oligarch_lobby'))).toBe(false); // start 35
    const rotten = makeState('realism', (s) => { s.stats.corruption = 60; });
    expect(eventEligible(rotten, byId('oligarch_lobby'))).toBe(true);
  });

  test('eligibleEvents pool only contains eligible defs; new ids are in config', () => {
    const pool = eligibleEvents(makeState()).map((d) => d.id);
    expect(pool).toContain('earthquake');
    expect(pool).toContain('viral_meme');
    expect(pool).not.toContain('currency_crisis');
    expect(pool).not.toContain('pensioner_march');
    // все 24 ивента (12 исходных + 12 новых) имеют уникальные id
    expect(new Set(BASE_EVENTS.map((d) => d.id)).size).toBe(24);
  });
});

describe('базовые ивенты: применение фиксированных эффектов', () => {
  test('oligarch_lobby: +corruption +treasury −workers mood', () => {
    const s = makeState('realism', (x) => { x.stats.corruption = 60; });
    const before = { corruption: s.stats.corruption, treasury: s.treasury, workers: s.mood.workers };
    applyBaseEvent(s, byId('oligarch_lobby'));
    expect(s.stats.corruption).toBe(before.corruption + 5);
    expect(s.treasury).toBe(before.treasury + 10);
    expect(s.mood.workers).toBeLessThan(before.workers); // −5 через усилитель реакции
    expect(s.counters.baseEvents).toBe(1);
  });

  test('epidemic: negative treasury, moodAll and economy', () => {
    const s = makeState('realism', (x) => { x.stats.poverty = 65; });
    applyBaseEvent(s, byId('epidemic'));
    expect(s.treasury).toBeLessThan(100);
    expect(s.mood.workers).toBeLessThan(50);
    expect(s.stats.economy).toBeLessThan(50);
  });
});
