# 4Key Web Rhythm Game — Technical Requirements Document

> 문서 버전: 1.0  
> 작성 기준일: 2026-08-21  
> 대응 문서: `PRD.md`  
> 대상 콘텐츠: ARForest — The Last Page / YUGEN 4Key 스킨

## 1. 기술 목표와 범위

이 문서는 현재 폴더에 존재하는 한 곡과 한 스킨을 브라우저에서 플레이하기 위한 구현 기준을 정의한다. 첫 구현은 정적 웹 애플리케이션이며, 게임 로직을 완성한 뒤 Supabase 기반 리더보드와 1대1 대전을 추가할 수 있도록 경계를 분리한다.

핵심 기술 목표는 다음과 같다.

- `.osu` Mania 4Key 맵 네 개를 런타임에 파싱한다.
- `audio.mp3`와 Web Audio API 시간을 게임의 단일 기준 시계로 사용한다.
- Canvas 2D에서 YUGEN 스킨을 사용해 60FPS로 렌더링한다.
- 판정과 결과 계산을 렌더러·UI와 분리해 단위 테스트할 수 있게 한다.
- 정적 배포 경로와 브라우저 보안 정책을 준수한다.
- 온라인 기능을 추가해도 로컬 게임 엔진의 결정성과 프레임 성능을 해치지 않는다.

## 2. 분석된 입력 리소스

### 2.1 곡 디렉터리

기준 경로는 `1276332 ARForest - The Last Page/`이다.

필수 파일:

- `audio.mp3`: 모든 난이도가 공유하는 음원
- `bg.jpg`: 모든 난이도가 참조하는 배경
- `ARForest - The Last Page (PokeSky) [Easy].osu`
- `ARForest - The Last Page (PokeSky) [Normal].osu`
- `ARForest - The Last Page (PokeSky) [Hard].osu`
- `ARForest - The Last Page (PokeSky) [Insane].osu`

곡 폴더 안의 WAV·MP3는 비트맵 자체의 샘플일 수 있다. MVP에서는 노트별 커스텀 파일명을 모두 재현하지 않고 YUGEN 기본 Soft 타격음으로 폴백한다. `.osb`는 파싱하지 않는다.

### 2.2 맵 검증값

| 난이도 | Mode | Keys | BPM | Timing points | Hit objects | Long notes | 첫/마지막 노트 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Easy | 3 | 4 | 195 | 13 | 547 | 81 | 7.550s / 136.626s |
| Normal | 3 | 4 | 195 | 13 | 831 | 108 | 7.550s / 136.626s |
| Hard | 3 | 4 | 195 | 13 | 1,214 | 25 | 7.550s / 136.626s |
| Insane | 3 | 4 | 195 | 13 | 1,408 | 152 | 7.550s / 136.626s |

파서는 이 값들을 테스트 fixture의 기대값으로 사용한다. 맵 파일이 바뀌면 검증값도 명시적으로 갱신한다.

### 2.3 스킨 디렉터리

기준 설정 파일은 `- YUGEN -/Skin.ini`이다. 완전히 동일했던 내부 중복 폴더는 제거되었으며 앱의 스킨 루트는 최상위 `- YUGEN -/` 하나로 고정한다. Standard·Taiko·Catch 전용 이미지와 다른 모드 아이콘도 제거되어, 현재 폴더에는 4Key 플레이와 메뉴·설정·결과·리더보드·멀티플레이 확장용 자산만 남아 있다.

4Key 설정:

- `Keys: 4`
- `ColumnStart: 340`
- `HitPosition: 400`
- `ColumnWidth: 45,45,45,45`
- `ColumnLineWidth: 0,0,0,0,0`
- `ScorePosition: 300`
- `ComboPosition: 275`
- `LightFramePerSecond: 24`
- `Colour1..4: 0,0,0,240`
- `ColourLight1/4: 102,205,107,175`
- `ColourLight2/3: 69,188,250,175`

사용 가능한 Mania 자산에는 `mania-key*`, `mania-note*`, `mania-stage-*`, `mania-lighting*`, `mania-hit*`의 일반 및 `@2x` 이미지가 포함된다.

정리 후 스킨 루트의 파일 수는 다음과 같다.

| 형식 | 개수 | 사용 범위 |
|---|---:|---|
| PNG | 406 | Mania, 메뉴, HUD, 결과, 설정과 확장 UI |
| WAV | 48 | UI, 카운트다운, 타격, 결과와 대전 효과음 |
| JPG | 4 | 메뉴와 플레이필드 배경 |
| MP3 | 3 | 준비·결과·실패 연출 |
| INI | 1 | 스킨 설정 |
| DB | 1 | 원본 스킨 부가 데이터; 앱에서는 읽지 않음 |

### 2.4 스킨 이미지 역할

| 모듈 | 핵심 파일군 |
|---|---|
| MenuScene | `menu-background*`, `menu-button-background*`, `mode-mania*`, `menu-back-*` |
| DifficultyScene | `selection-*`, `songselect-bottom*`, `star*` |
| GameplayRenderer | `mania-note*`, `mania-key*`, `mania-stage*`, `mania-hit*` |
| Gameplay HUD | `score-*`, `combo-*`, `scorebar-*`, `inputoverlay-*`, `lighting*` |
| Pause/Fail | `pause-*`, `fail-background.png` |
| ResultScene | `ranking-*`, `section-pass*`, `section-fail*` |

`menu-back-0..58`은 시작 화면 배경이 아니라 뒤로 가기 버튼 애니메이션이다. `ranking-panel.png`가 결과 대시보드의 기본 패널이며 숫자와 실제 결과값은 런타임에 합성한다.

### 2.5 스킨 오디오 역할과 상태

| 구분 | 파일 | 로딩 정책 |
|---|---|---|
| 메뉴 | `welcome.wav`, `menuclick.wav`, `menuhit.wav`, `menuback.wav`, `whoosh.wav` | 앱 시작 시 짧은 효과음 preload |
| 시작 | `ready.mp3`, `count3s.wav`, `count2s.wav`, `count1s.wav`, `gos.wav` | 게임 준비 시 preload |
| 플레이 | `soft-hitnormal.wav`, `combobreak.wav` | 게임 준비 시 preload |
| 결과 | `sectionpass.wav`, `sectionfail.wav` | 게임 준비 시 preload |
| 긴 결과 연출 | `applause.mp3`, `failsound.mp3` | 결과 상태에 따라 lazy load |
| 대전 | `match-confirm.wav`, `match-start.wav` | 온라인 모듈 진입 시 lazy load |

현재 맵 네 개의 TimingPoints는 모두 `SampleSet: 2`이므로 Soft 샘플이 기본이다. `normal-*`과 `drum-*`은 향후 4Key 맵의 샘플셋 호환성을 위해 유지하되 MVP 시작 시 전부 로딩하지 않는다.

다음 파일은 스킨에 남아 있어도 앱 manifest에서 제외한다.

- `ready.wav`, `readys.wav`: 각각 약 4ms로 실사용 불가
- 0바이트 또는 프레임이 없는 slider 계열 WAV
- PCM WAV로 바로 해석되지 않는 `drum-slidertick.wav`
- `Skin.ini`에서 참조되지 않고 4Key 흐름에도 배정되지 않은 효과음

## 3. 기술 스택

| 영역 | 선택 | 사용 목적 |
|---|---|---|
| 언어 | JavaScript ES2022+ | 게임 및 UI 로직 |
| 모듈 | Native ES Modules | 기능 분리와 브라우저 실행 |
| UI | HTML5 + CSS3 | 메뉴, 설정, 결과 화면 |
| 렌더링 | Canvas 2D | 레인, 노트, 판정, HUD |
| 오디오 | Web Audio API | 디코딩, 재생, 정밀 시계 |
| 로컬 저장 | LocalStorage | 설정과 개인 최고 기록 |
| 테스트 | Vitest + jsdom | 파서와 순수 로직 단위 테스트 |
| 개발 서버/빌드 | Vite | 로컬 개발과 정적 번들 |
| 온라인 데이터 | Supabase | 익명 인증, Postgres, Realtime |
| 배포 | Vercel | 정적 프런트엔드 배포 |

React 같은 UI 프레임워크는 MVP에 사용하지 않는다. 메뉴 규모가 작고, 게임 렌더링은 Canvas가 담당하므로 DOM과 의존성을 최소화한다.

## 4. 권장 프로젝트 구조

```text
gameProject/
├─ index.html
├─ package.json
├─ vite.config.js
├─ public/
│  ├─ songs/the-last-page/       # 현재 곡 리소스의 배포용 위치
│  └─ skins/yugen/               # 현재 스킨 리소스의 배포용 위치
├─ src/
│  ├─ app/
│  │  ├─ app.js
│  │  └─ sceneManager.js
│  ├─ audio/
│  │  ├─ audioEngine.js
│  │  ├─ audioClock.js
│  │  └─ effectManager.js
│  ├─ beatmap/
│  │  ├─ osuParser.js
│  │  └─ songCatalog.js
│  ├─ engine/
│  │  ├─ gameEngine.js
│  │  ├─ gameState.js
│  │  └─ gameLoop.js
│  ├─ input/inputManager.js
│  ├─ judgement/
│  │  ├─ judgementEngine.js
│  │  └─ scoreEngine.js
│  ├─ renderer/
│  │  ├─ canvasRenderer.js
│  │  └─ notePool.js
│  ├─ skin/
│  │  ├─ skinIniParser.js
│  │  └─ skinManager.js
│  ├─ storage/localRepository.js
│  ├─ online/
│  │  ├─ leaderboardRepository.js
│  │  └─ matchRepository.js
│  ├─ ui/
│  └─ config/
│     ├─ gameConfig.js
│     └─ contentManifest.js
└─ tests/
```

현재 정리된 원본 리소스 폴더는 추가로 삭제하거나 이름을 바꾸지 않는다. 구현 시 실제 manifest가 참조하는 파일만 배포 가능한 `public/` 아래로 복사하거나 빌드 전용 복사 스크립트로 배치한다. 원본과 배포본의 출처가 명확해야 하며 463개 파일 전체를 무조건 배포하지 않는다.

## 5. 정적 콘텐츠 계약

한 곡만 제공하더라도 파일명을 여러 모듈에 하드코딩하지 않는다. `contentManifest.js`에서 단일 소스로 관리한다.

```js
export const CONTENT = {
  song: {
    id: 'the-last-page',
    title: 'The Last Page',
    artist: 'ARForest',
    creator: 'PokeSky',
    audioUrl: '/songs/the-last-page/audio.mp3',
    backgroundUrl: '/songs/the-last-page/bg.jpg',
    previewTimeMs: 98934,
    difficulties: [
      { id: 'easy', label: 'Easy', beatmapId: 2654029, mapUrl: '/songs/the-last-page/easy.osu' },
      { id: 'normal', label: 'Normal', beatmapId: 2652890, mapUrl: '/songs/the-last-page/normal.osu' },
      { id: 'hard', label: 'Hard', beatmapId: 2652889, mapUrl: '/songs/the-last-page/hard.osu' },
      { id: 'insane', label: 'Insane', beatmapId: 2651800, mapUrl: '/songs/the-last-page/insane.osu' }
    ]
  },
  skin: {
    id: 'yugen',
    baseUrl: '/skins/yugen/',
    iniUrl: '/skins/yugen/Skin.ini'
  }
};
```

Vercel 하위 경로 배포 가능성을 위해 실제 구현에서는 `new URL(path, import.meta.env.BASE_URL)` 또는 동등한 URL 해석기를 한 곳에서 사용한다.

## 6. 핵심 데이터 타입

JavaScript 프로젝트라도 JSDoc typedef 또는 별도 `.d.ts`로 아래 계약을 고정한다.

```ts
type Lane = 0 | 1 | 2 | 3;

type HitObject = {
  id: number;
  lane: Lane;
  startTimeMs: number;
  endTimeMs: number | null;
  kind: 'tap' | 'hold';
  hitSound: number;
};

type TimingPoint = {
  timeMs: number;
  beatLengthMs: number;
  meter: number;
  uninherited: boolean;
};

type Beatmap = {
  beatmapId: number;
  setId: number;
  title: string;
  artist: string;
  creator: string;
  difficulty: 'Easy' | 'Normal' | 'Hard' | 'Insane';
  mode: 3;
  keyCount: 4;
  audioFilename: string;
  backgroundFilename: string;
  previewTimeMs: number;
  hpDrainRate: number;
  overallDifficulty: number;
  timingPoints: TimingPoint[];
  hitObjects: HitObject[];
};

type Judgement = 'perfect' | 'great' | 'good' | 'miss';

type PlayResult = {
  resultId: string;
  songId: 'the-last-page';
  difficultyId: 'easy' | 'normal' | 'hard' | 'insane';
  beatmapId: number;
  score: number;
  accuracy: number;
  maxCombo: number;
  judgements: Record<Judgement, number>;
  cleared: boolean;
  playedAt: string;
  rulesetVersion: 2;
};
```

## 7. `.osu` 파서 요구사항

### 7.1 지원 섹션

- `[General]`: `AudioFilename`, `PreviewTime`, `Mode`
- `[Metadata]`: 제목, 아티스트, 제작자, 난이도, Beatmap ID/Set ID
- `[Difficulty]`: `HPDrainRate`, `CircleSize`, `OverallDifficulty`
- `[Events]`: 첫 번째 배경 이미지 이벤트
- `[TimingPoints]`: 기본·상속 타이밍 포인트
- `[HitObjects]`: 일반 노트와 Mania hold note

### 7.2 레인 계산

osu! 좌표 `x`의 범위는 0~511이다. 4Key 레인은 다음처럼 계산한다.

```js
const lane = Math.min(3, Math.floor(x * 4 / 512));
```

### 7.3 노트 종류

- `type & 1`: 일반 노트
- `type & 128`: 롱 노트
- 롱 노트의 종료 시각은 objectParams의 첫 `:` 앞 숫자에서 읽는다.
- 지원하지 않는 오브젝트는 경고 후 무시하되 파싱 전체를 중단하지 않는다.

### 7.4 입력 검증

- `Mode !== 3` 또는 `CircleSize !== 4`이면 플레이를 거부한다.
- 음원·배경 파일명은 현재 콘텐츠 루트 밖으로 탈출할 수 없게 정규화한다.
- 노트는 시작 시각, 레인, 원본 순서로 안정 정렬한다.
- 끝 시각이 시작 시각보다 이른 롱 노트는 오류로 처리한다.

## 8. 오디오와 게임 시계

### 8.1 오디오 재생

- 첫 클릭 또는 키 입력에서 `AudioContext.resume()`을 호출한다.
- MP3를 `fetch → arrayBuffer → decodeAudioData` 순서로 한 번 디코딩한다.
- AudioBuffer는 세션 동안 캐시한다.
- 재생, 일시정지, 재개, 정지, 미리듣기와 처음부터 재시작을 제공한다.
- 곡은 `musicGain`, 짧은 UI·타격·결과 효과음은 `effectGain`에 연결하고 둘을 `masterGain`으로 합친다.
- 효과음은 판정과 독립된 `EffectManager`가 재생하며 같은 AudioBuffer로 여러 SourceNode를 만들 수 있다.
- 고밀도 패턴에서 타격음이 과도하게 겹치지 않도록 동일 타격음에 짧은 동시 재생 제한 또는 voice stealing을 적용한다.
- `applause.mp3`와 `failsound.mp3`는 초기 번들 로딩을 막지 않으며 필요 시에만 가져온다.

### 8.2 단일 기준 시계

게임 시간은 다음 값으로 계산한다.

```text
songTimeMs = (audioContext.currentTime - sourceStartedAt) × 1000
             + resumeOffsetMs
             + userOffsetMs
```

`performance.now()`와 프레임 누적값은 판정 시간으로 사용하지 않는다. `requestAnimationFrame`은 현재 song time을 읽어 그 시점의 화면만 렌더링한다.

### 8.3 일시정지

AudioBufferSourceNode는 재사용할 수 없으므로 일시정지 시 현재 offset을 저장하고 노드를 정지한다. 재개 시 새 source를 만들고 저장된 offset부터 시작한다. 게임 상태 전환과 오디오 노드 교체는 하나의 원자적 메서드에서 처리한다.

## 9. 입력과 판정

### 9.1 입력

- 기본 매핑: `KeyD`, `KeyF`, `KeyJ`, `KeyK`
- 문자 대신 `KeyboardEvent.code`를 저장해 키보드 레이아웃 영향을 줄인다.
- `event.repeat === true`인 keydown은 무시한다.
- 게임 활성 상태에서만 입력을 판정하고 필요한 키의 기본 브라우저 동작을 막는다.
- `blur`와 `visibilitychange`에서 모든 pressed 상태를 해제하고 자동 일시정지한다.

### 9.2 판정 구간

MVP의 앱 고정 판정 구간은 절대 시간 차이를 기준으로 한다.

| 판정 | 허용 오차 |
|---|---:|
| Perfect | ≤ 45ms |
| Great | ≤ 70ms |
| Good | ≤ 120ms |
| Miss | > 120ms |

이 값은 `gameConfig.js`에서 `RULESET_VERSION = 2`와 함께 관리한다. 향후 조정할 때 기존 리더보드와 섞지 않도록 ruleset version을 올린다.

### 9.3 판정 알고리즘

- 레인별로 아직 판정되지 않은 노트의 인덱스를 유지해 전체 배열을 매 입력마다 탐색하지 않는다.
- keydown 시 해당 레인의 가장 가까운 판정 가능 노트 하나만 처리한다.
- `songTime > startTime + 120ms`가 된 미처리 노트는 Miss로 처리한다.
- 롱 노트 시작이 Good 이상이면 hold 활성 상태로 전환한다.
- 끝 시점까지 키를 유지하면 hold 성공으로 처리하고, 끝보다 120ms 이상 일찍 떼면 Miss 처리한다.
- 한 노트는 정확히 한 번만 최종 판정된다.

## 10. 점수와 상태 계산

### 10.1 판정 가중치

| 판정 | 정확도 가중치 | HP 변화 |
|---|---:|---:|
| Perfect | 1.0 | +1.0 |
| Great | 0.8 | +0.5 |
| Good | 0.5 | 0 |
| Miss | 0 | -6.0 |

HP는 0~100으로 제한한다. 0에 도달하면 `failed = true`를 고정하되 연습과 결과 수집을 위해 곡은 계속 진행한다.

### 10.2 정확도와 점수

```text
accuracy = 판정 가중치 합 / 전체 판정 대상 수
score = round(accuracy × 900,000 + comboRatio × 100,000)
comboRatio = maxCombo / 전체 판정 대상 수
```

점수는 0~1,000,000으로 제한한다. 롱 노트는 MVP에서 하나의 판정 대상으로 계산한다. 결과의 모든 합산은 동일한 순수 함수로 수행하여 HUD, 결과 화면, 로컬 기록과 온라인 제출이 같은 값을 사용하게 한다.

## 11. 렌더링

### 11.1 Canvas

- Canvas의 CSS 크기와 실제 backing size를 `devicePixelRatio`에 맞춘다.
- 기준 좌표계는 640×480으로 두고 화면에 맞게 균일 확대한다.
- YUGEN의 `ColumnStart`, `ColumnWidth`, `HitPosition`을 기준 좌표계에서 적용한다.
- 배경은 cover 방식으로 그린 뒤 어두운 반투명 레이어를 올린다.

### 11.2 노트 위치

```text
y = hitPosition - (noteTimeMs - songTimeMs) × pixelsPerMs
```

사용자 scroll speed는 `pixelsPerMs`로 변환한다. 롱 노트 body 길이는 `(endTimeMs - startTimeMs) × pixelsPerMs`이다. 화면 밖 객체는 draw call에서 제외한다.

### 11.3 스킨 해석

- `Skin.ini`의 섹션 순서를 유지하며 `Keys: 4`인 `[Mania]` 블록만 선택한다.
- 파일명 조회는 대소문자를 구분하지 않는 인덱스를 만들어 Windows와 Vercel/Linux 차이를 흡수한다.
- `@2x`가 있으면 고해상도 텍스처로 선택하되 논리 크기는 절반으로 계산한다.
- 명시되지 않은 Mania 이미지 이름은 osu! 스킨 기본 naming convention으로 해석한다.
- 이미지가 없거나 디코딩에 실패하면 Canvas로 만든 단색 placeholder를 사용하고 경고를 남긴다.

### 11.4 화면별 합성 규칙

- 시작 화면은 `menu-background.jpg` 위에 HTML 텍스트와 `menu-button-background.png` 버튼을 합성한다.
- 난이도 화면은 곡의 `bg.jpg`를 주 배경으로 사용하고 `selection-*`은 장식 또는 보조 버튼에만 사용한다.
- 플레이 화면은 곡 배경, 어두운 오버레이, Mania 레인, 노트, 판정과 HUD 순서로 그린다.
- 결과 화면은 곡 배경 위에 `ranking-panel.png`, 등급 이미지, score 숫자와 앱 버튼을 합성한다.
- 일시정지는 `pause-overlay.png` 위에 계속·재시작·난이도 선택 동작을 연결한다.
- `@2x`와 일반 파일이 모두 있으면 `devicePixelRatio`에 따라 선택하되 둘을 동시에 로딩하지 않는다.

### 11.5 성능

- 노트·효과 객체는 풀링하거나 재사용한다.
- 현재 시야의 시작·끝 인덱스를 유지한다.
- 텍스트나 정적 배경은 매 프레임 불필요하게 재계산하지 않는다.
- 개발 모드에서 FPS, frame time, song time, visible note count와 draw calls를 표시할 수 있게 한다.

## 12. 장면과 상태 전이

```text
BOOT → LOADING → MENU → DIFFICULTY_SELECT → READY → PLAYING → RESULT
                                      PLAYING ↔ PAUSED
                                      RESULT → READY 또는 DIFFICULTY_SELECT
```

- 한 번에 하나의 장면만 입력을 소유한다.
- 장면 전환 시 오래된 이벤트 리스너와 animation frame을 정리한다.
- `PLAYING` 진입은 선택된 beatmap, 디코딩된 audio buffer와 스킨 필수 텍스처가 모두 준비된 경우에만 허용한다.

## 13. 로컬 저장소

키는 앱 네임스페이스와 스키마 버전을 포함한다.

```text
rhythm-game:v1:settings
rhythm-game:v1:best-results
rhythm-game:v1:player
```

```ts
type GameSettings = {
  keyBindings: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'];
  scrollSpeed: number;
  offsetMs: number;
  masterVolume: number;
  effectVolume: number;
  lastDifficultyId: 'easy' | 'normal' | 'hard' | 'insane';
};
```

- 범위를 벗어난 값, 중복 키와 손상된 JSON은 기본값으로 복구한다.
- 최고 기록은 difficulty ID별로 저장한다.
- 새 결과가 더 높은 점수일 때만 최고 기록을 교체한다. 동점이면 정확도, 최대 콤보 순으로 비교한다.

## 14. 온라인 확장 설계

MVP에서는 온라인 모듈을 호출하지 않는다. 도입 시 UI와 게임 엔진은 아래 저장소 계약에만 의존한다.

```ts
interface LeaderboardRepository {
  submit(result: PlayResult): Promise<void>;
  getTop(difficultyId: string, limit: number): Promise<LeaderboardEntry[]>;
  getMine(difficultyId: string): Promise<LeaderboardEntry | null>;
}

interface MatchRepository {
  createRoom(difficultyId: string): Promise<Room>;
  joinRoom(code: string): Promise<Room>;
  setReady(roomId: string, ready: boolean): Promise<void>;
  subscribe(roomId: string, onEvent: (event: MatchEvent) => void): () => void;
  publishProgress(roomId: string, progress: LiveScore): Promise<void>;
  finish(roomId: string, result: PlayResult): Promise<void>;
}
```

### 14.1 Supabase 테이블

- `profiles(id uuid PK, display_name text, created_at timestamptz)`
- `scores(id uuid PK, user_id uuid, beatmap_id bigint, difficulty_id text, score int, accuracy numeric, max_combo int, judgements jsonb, ruleset_version int, played_at timestamptz)`
- `rooms(id uuid PK, code text UNIQUE, host_id uuid, beatmap_id bigint, difficulty_id text, status text, starts_at timestamptz, expires_at timestamptz)`
- `room_players(room_id uuid, user_id uuid, ready bool, connected_at timestamptz, finished_at timestamptz, result jsonb, PRIMARY KEY(room_id,user_id))`

`scores`에는 `(user_id, beatmap_id, difficulty_id, ruleset_version)` 유니크 키를 두고 더 좋은 결과만 RPC로 upsert한다.

### 14.2 보안과 검증

- Supabase Anonymous Sign-ins를 사용한다.
- RLS로 사용자는 자기 프로필·점수만 쓰고 전체 리더보드는 읽을 수 있게 한다.
- 점수, 정확도, 콤보, 판정 합계와 해당 맵의 노트 수 관계를 RPC에서 검증한다.
- 클라이언트만으로 완전한 부정행위 방지는 불가능함을 명시한다.
- 진행 상태는 최대 초당 4회 전송하고 최종 결과만 영구 저장한다.

### 14.3 대전 동기화

- 호스트의 로컬 시각이 아닌 Supabase 서버 시각 기준 `starts_at`을 사용한다.
- 클라이언트는 서버 시각 오프셋을 여러 번 측정해 중앙값을 사용한다.
- 시작 전 충분한 lead time을 두어 양쪽이 음원을 디코딩하도록 한다.
- 상대의 실시간 값은 관전 정보일 뿐 로컬 판정에 사용하지 않는다.
- 방은 두 명으로 제한하고 만료 시 정리한다.

## 15. 오류 처리

| 오류 | 처리 |
|---|---|
| AudioContext 차단 | 시작 버튼과 재시도 안내 |
| MP3 fetch/decode 실패 | 로딩 중단, 파일명 표시, 재시도 |
| `.osu` 형식 오류 | 해당 난이도 비활성화, 원인 로그 |
| 배경 누락 | 단색 배경 사용 |
| 스킨 이미지 누락 | placeholder 사용, 플레이 지속 |
| 효과음 누락·디코딩 실패 | 해당 효과음만 비활성화하고 플레이 지속 |
| 빈 WAV 또는 지원하지 않는 WAV codec | manifest 단계에서 제외하고 경고 기록 |
| 포커스 상실 | 자동 일시정지 |
| LocalStorage 접근 실패 | 메모리 설정으로 계속 진행 |
| 온라인 연결 실패 | 로컬 플레이 유지, 온라인 기능만 비활성화 |
| 상대 이탈 | 재접속 대기 후 기권 처리 |

## 16. 테스트 계획

### 16.1 단위 테스트

- 네 맵의 metadata, timing point, 노트 수와 롱 노트 수 검증
- x 좌표 경계값 `0, 127, 128, 255, 256, 383, 384, 511`의 레인 변환
- 일반·롱 노트 파싱과 잘못된 종료 시각 거부
- 판정 구간의 경계값 ±35ms, ±70ms, ±120ms
- Miss 자동 처리와 한 노트 중복 판정 방지
- 점수·정확도·콤보·HP 순수 함수
- 설정 검증, 손상된 LocalStorage 복구와 최고 기록 비교
- `Skin.ini`에서 정확히 4Key 블록 선택
- 오디오 manifest에 빈·비정상 WAV가 포함되지 않는지 검증
- 화면 상태별 필수 이미지와 효과음 경로가 실제 파일과 일치하는지 검증

### 16.2 통합 테스트

- 사용자 입력으로 AudioContext 활성화 후 곡 시작
- 각 난이도 로딩 → 준비 → 플레이 → 결과 전이
- 일시정지와 재개 후 song time 연속성
- 재시작 시 이전 노트·판정 상태 완전 초기화
- offset과 scroll speed 변경의 즉시 반영
- YUGEN 텍스처 로딩 실패 시 폴백
- 음악·효과음 gain 분리와 효과음 음소거 확인
- Soft 타격음의 반복 재생이 AudioClock에 영향을 주지 않는지 확인

### 16.3 수동 및 성능 테스트

- Chrome, Edge, Firefox에서 네 난이도를 각각 완주한다.
- Insane에서 평균 60FPS, 눈에 띄는 입력 지연과 오디오 드리프트가 없는지 확인한다.
- 브라우저 탭 이동, 창 크기 변경, 오디오 장치 변경과 빠른 재시작을 확인한다.
- 10회 연속 재도전 후 AudioBuffer와 이벤트 리스너가 누적되지 않는지 확인한다.
- 온라인 단계에서는 두 브라우저로 방 생성부터 결과 확정까지 E2E 테스트한다.

## 17. 배포와 운영

- Vite production build가 정적 파일만 생성해야 한다.
- Vercel은 SPA fallback을 구성하되 모든 자산 URL이 직접 요청으로 정상 응답해야 한다.
- `.osu`, `.ini`, `.mp3`, `.wav`에 필요한 MIME type과 캐시 헤더를 확인한다.
- 해시된 앱 번들은 장기 캐시하고, 콘텐츠 manifest와 맵은 재검증 가능한 캐시 정책을 사용한다.
- Supabase URL과 anon key만 클라이언트 환경 변수로 제공한다. service role key는 절대 브라우저에 포함하지 않는다.

## 18. 구현 순서

1. Vite 앱 셸, 곡·이미지·오디오 manifest와 배포용 리소스 경로를 구성한다.
2. `.osu` 파서와 네 맵 fixture 테스트를 완성한다.
3. AudioEngine, AudioClock, EffectManager와 단계별 로딩 화면을 구현한다.
4. Skin.ini 파서, 텍스처 로더와 Canvas 레인·노트 렌더러를 구현한다.
5. 입력, 판정, 점수, 게임 루프와 HUD를 연결한다.
6. 난이도 선택, 설정, 일시정지, 결과와 로컬 기록을 구현한다.
7. 네 난이도 완주·성능·브라우저 테스트 후 싱글 플레이 MVP를 배포한다.
8. Supabase 리더보드를 별도 단계로 추가한다.
9. 방·Realtime 진행 정보·결과 확정을 추가해 1대1 대전을 완성한다.

## 19. 기술적 완료 조건

- 네 `.osu` 파일의 분석값이 자동 테스트와 일치한다.
- 음악 시간이 모든 노트 위치와 판정의 유일한 시간 기준이다.
- YUGEN 4Key 자산이 Linux 대소문자 차이에도 안정적으로 조회된다.
- Standard·Taiko·Catch 전용 파일 없이 메뉴부터 결과까지 필요한 화면이 구성된다.
- 빈·비정상 오디오를 로딩하지 않고 Soft 타격음과 화면별 효과음이 정상 재생된다.
- 네 난이도에서 일반·롱·동시 입력을 포함해 결과 화면까지 도달한다.
- 재도전과 장면 전환 후 오디오 노드, animation frame과 입력 리스너가 중복되지 않는다.
- 정적 production build가 Vercel 환경에서 직접 실행된다.
- 온라인 기능이 없어도 싱글 플레이 전체가 완전하게 동작한다.
