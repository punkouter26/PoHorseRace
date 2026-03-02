/**
 * PoAudioService.test.ts — Unit tests for PoAudioService (T074).
 *
 * Validates:
 *   - All five public methods (init, playRimClack, playRumble, stopRumble, playWinnerBell)
 *     call the correct Tone.js mock methods with expected arguments after init().
 *   - All methods are no-ops before init() is called.
 *
 * Tone.js is mocked entirely — no real audio context needed in test environment.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Tone.js synthesisers BEFORE importing the service
// ---------------------------------------------------------------------------

// Capture live references to synth instances so we can assert on them.
const mockRimClackInstance = {
  toDestination: vi.fn().mockReturnThis(),
  frequency: { value: 0 },
  volume: { value: 0 },
  triggerAttackRelease: vi.fn(),
};

const mockRumbleInstance = {
  toDestination: vi.fn().mockReturnThis(),
  volume: { value: 0 },
  triggerAttack: vi.fn(),
  triggerRelease: vi.fn(),
};

const mockWinnerBellInstance = {
  toDestination: vi.fn().mockReturnThis(),
  triggerAttackRelease: vi.fn(),
};

vi.mock('tone', () => ({
  start: vi.fn().mockResolvedValue(undefined),
  now: vi.fn(() => 0),
  gainToDb: vi.fn((v: number) => v),
  MetalSynth: vi.fn(() => mockRimClackInstance),
  NoiseSynth: vi.fn(() => mockRumbleInstance),
  Synth: vi.fn(() => mockWinnerBellInstance),
  Destination: {},
}));

// Mock PoLogger
vi.mock('../../src/utils/PoLogger', () => ({
  PoLogger: { log: vi.fn() },
}));

// Import Tone for assertions AFTER mock registration
import * as Tone from 'tone';

// ---------------------------------------------------------------------------
// Tests — no-op behaviour (before init)
// ---------------------------------------------------------------------------

// Import the singleton AFTER mocks are in place.
import { poAudioService } from '../../src/services/PoAudioService';

describe('PoAudioService — before init()', () => {
  it('playRimClack does not invoke MetalSynth.triggerAttackRelease', () => {
    vi.clearAllMocks();
    poAudioService.playRimClack(0.5);
    expect(mockRimClackInstance.triggerAttackRelease).not.toHaveBeenCalled();
  });

  it('playRumble does not invoke NoiseSynth.triggerAttack', () => {
    vi.clearAllMocks();
    poAudioService.playRumble(10);
    expect(mockRumbleInstance.triggerAttack).not.toHaveBeenCalled();
  });

  it('stopRumble does not invoke NoiseSynth.triggerRelease', () => {
    vi.clearAllMocks();
    poAudioService.stopRumble();
    expect(mockRumbleInstance.triggerRelease).not.toHaveBeenCalled();
  });

  it('playWinnerBell does not invoke Synth.triggerAttackRelease', () => {
    vi.clearAllMocks();
    poAudioService.playWinnerBell();
    expect(mockWinnerBellInstance.triggerAttackRelease).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests — full behaviour (after init)
// ---------------------------------------------------------------------------

describe('PoAudioService — after init()', () => {
  beforeAll(async () => {
    await poAudioService.init();
  });

  it('init() calls Tone.start()', () => {
    expect(Tone.start).toHaveBeenCalled();
  });

  it('init() instantiates MetalSynth, NoiseSynth, and Synth', () => {
    expect(Tone.MetalSynth).toHaveBeenCalledOnce();
    expect(Tone.NoiseSynth).toHaveBeenCalledOnce();
    expect(Tone.Synth).toHaveBeenCalledOnce();
  });

  it('init() is idempotent — second call does not re-create synths', async () => {
    await poAudioService.init(); // second call
    // Each constructor still called only once
    expect(Tone.MetalSynth).toHaveBeenCalledOnce();
  });

  it('playRimClack(5) calls MetalSynth.triggerAttackRelease with correct note and duration', () => {
    mockRimClackInstance.triggerAttackRelease.mockClear();
    poAudioService.playRimClack(5);
    expect(mockRimClackInstance.triggerAttackRelease).toHaveBeenCalledWith(400, '16n');
  });

  it('playRumble(15) calls NoiseSynth.triggerAttack', () => {
    mockRumbleInstance.triggerAttack.mockClear();
    poAudioService.playRumble(15);
    expect(mockRumbleInstance.triggerAttack).toHaveBeenCalledOnce();
  });

  it('playRumble sets NoiseSynth volume proportional to speed', () => {
    poAudioService.playRumble(28); // max speed
    // gainToDb is mocked as identity; gain = 28/28 = 1.0
    expect(mockRumbleInstance.volume.value).toBeCloseTo(1.0, 2);
  });

  it('stopRumble() calls NoiseSynth.triggerRelease', () => {
    mockRumbleInstance.triggerRelease.mockClear();
    poAudioService.stopRumble();
    expect(mockRumbleInstance.triggerRelease).toHaveBeenCalledOnce();
  });

  it('playWinnerBell() calls Synth.triggerAttackRelease at least once (chord arpeggio)', () => {
    mockWinnerBellInstance.triggerAttackRelease.mockClear();
    poAudioService.playWinnerBell();
    // Implementation plays a 4-note arpeggio
    expect(mockWinnerBellInstance.triggerAttackRelease).toHaveBeenCalledTimes(4);
  });

  it('playWinnerBell() starts on C5', () => {
    mockWinnerBellInstance.triggerAttackRelease.mockClear();
    poAudioService.playWinnerBell();
    const firstCall = mockWinnerBellInstance.triggerAttackRelease.mock.calls[0];
    expect(firstCall[0]).toBe('C5');
  });
});
