# Web osu!standard Rhythm Game - Product Requirements Document

> 문서 버전: 2.8  
> 작성 기준일: 2026-08-29  
> 상태: 싱글 플레이 MVP 기준  
> 대응 기술 문서: `TRD.md`  
> 초기 콘텐츠: `toby fox - MEGALOVANIA` / `- YUGEN -`

버전 2.8은 active skin을 바깥쪽 `- YUGEN -/` 폴더의 직접 파일로 교체하고 `play.mp4`를 새 시각·상호작용 참고 영상으로 채택한다. 영상의 replay 점수·정확도·UR·pp·입력 trace와 map/video offset은 presentation 검증값이며 판정·ScoreV1·HP·오브젝트·시간 공식은 `TRD.md`와 프로젝트 회귀 fixture를 따른다. `gameex.md`는 기존 `ordr-video.mp4` 관찰을 폐기하고 이 presentation 계약으로 개정되었다.

## 1. 제품 개요

### 1.1 제품 정의

PC 웹 브라우저에서 마우스로 커서를 움직이고 음악에 맞춰 화면의 오브젝트를 클릭하는 osu!standard 방식의 리듬게임이다. 사용자는 Hit Circle을 정확한 시점에 클릭하고, Slider를 누른 채 경로를 따라가며, Spinner를 회전시켜 점수·콤보·정확도·HP를 관리한다.

첫 배포는 **한 곡을 완성도 있게 플레이할 수 있는 정적 웹 게임**을 목표로 한다. 제공 콘텐츠는 `387700 toby fox - MEGALOVANIA/`의 다섯 Standard 난이도와 바깥쪽 `- YUGEN -/` 스킨이다. 완성된 MVP는 Vercel에 배포하며, 이후 게임 엔진을 변경하지 않고 콘텐츠 카탈로그에 여러 곡을 추가할 수 있어야 한다.

### 1.2 제품 목표

- 별도 설치 없이 최신 PC 브라우저에서 실행한다.
- 마우스 좌·우 버튼과 `Z`·`X` 보조 키로 osu!standard의 핵심 플레이를 제공한다.
- Hit Circle, Slider, Spinner를 실제 비트맵의 AR, OD, CS, HP 설정에 맞춰 처리한다.
- 음악과 오브젝트가 체감상 어긋나지 않도록 오디오 시간을 기준으로 동기화한다.
- 실제 제공된 다섯 난이도를 모두 지원한다.
- `- YUGEN -`의 Standard 스킨 이미지와 효과음을 사용한다.
- `play.mp4`에서 확인한 플레이필드·storyboard 좌표계, HUD 위치, 준비 표시, 커서·오브젝트 피드백, break와 결과 화면을 presentation 기준으로 사용한다.
- 공유 `.osb`, 난이도별 내장 스토리보드와 `SB/` 자산을 현재 콘텐츠 범위에서 재생한다.
- 점수, 콤보, 정확도, HP, 판정 수, 랭크와 로컬 최고 기록을 제공한다.
- 첫 배포는 한 곡으로 단순하게 구성하되 여러 곡으로 확장 가능한 데이터 구조를 유지한다.

### 1.3 플레이 방식 기준

이 제품은 osu!의 공식 클라이언트나 호환 클라이언트가 아니다. osu!standard의 플레이 방식과 공개된 파일 형식·난이도 공식을 참고해 아래 기능을 독립적인 웹 게임 규칙으로 구현한다.

- `.osu` file format v14 해석
- Circle, Slider, Spinner의 표시와 판정
- AR 기반 표시 시간, OD 기반 300/100/50 판정 구간, CS 기반 크기
- Slider leniency, notelock, stacking과 Slider part 판정
- ScoreV1 방식의 점수, 콤보, 정확도와 결과 랭크
- HPDrainRate 기반 게이지와 실패
- 스킨의 콤보 색상, 타격음, 커서, 판정 및 결과 자산
- 공유·난이도별 스토리보드의 시간과 레이어 순서

공식 리플레이 호환, 동일 점수 보장, 비트 단위 동일성, 공식 랭킹 비교와 모든 임의 비트맵·스킨의 범용 호환은 제품 목표가 아니다. 세부 규칙은 TRD의 프로젝트 상수와 자체 회귀 fixture로 고정한다. 규칙 변경으로 저장 결과의 비교 가능성이 달라지면 `RULESET_VERSION`을 올린다.

## 2. 제품 범위

### 2.1 싱글 플레이 MVP에 포함하는 것

- `MEGALOVANIA` 한 곡과 다섯 난이도
- 마우스 커서 이동, 좌·우 클릭, `Z`·`X` 보조 입력
- Hit Circle, Slider, Spinner
- 300, 100, 50, Miss와 Slider part 판정
- ScoreV1 점수, 콤보, 정확도, HP와 결과 랭크
- `- YUGEN -` Standard 스킨
- 공유 `.osb`, 난이도별 내장 스토리보드와 스토리보드 사운드
- 곡 미리듣기, 난이도 선택, 로딩, 준비, 플레이, 일시정지, 실패, 결과 화면
- 입력 오프셋, 음량, 배경 밝기, 커서와 키 설정
- 브라우저 로컬 최고 기록
- Vite 정적 빌드와 Vercel 배포

### 2.2 싱글 플레이 MVP에서 제외하는 것

- 두 번째 곡과 사용자 곡 업로드
- 비트맵·스토리보드·스킨 편집기
- osu! 리플레이 파일의 재생·저장 또는 공식 리플레이 호환
- osu! 계정, 공식 랭킹 및 공식 서버 연동
- Easy, Hard Rock, Double Time, Hidden 등 modifier
- Auto, Relax, Cinema와 자동 플레이
- Standard 이외 Taiko, Catch, Mania 규칙
- 모바일·터치 전용 조작과 태블릿 압력 입력
- 현재 제공 콘텐츠에서 사용하지 않는 모든 스킨·스토리보드 명령의 범용 호환
- 첫 배포의 서버 데이터베이스, 회원가입, 리더보드와 실시간 대전

### 2.3 후속 확장 범위

- 관리자가 검증한 여러 곡을 콘텐츠 카탈로그에 추가
- 곡 검색, 정렬, 즐겨찾기와 곡별 최고 기록
- 추가 스킨 선택
- modifier와 연습 모드
- 온라인 리더보드
- 방 코드 기반 1대1 실시간 대전

사용자가 임의 파일을 업로드하는 기능은 다곡 지원과 별개다. 다곡 지원은 프로젝트에 배포된 검증 콘텐츠만 대상으로 한다.

## 3. 실제 제공 콘텐츠

### 3.1 곡 세트

| 항목 | 실제 값 |
|---|---|
| 폴더 | `387700 toby fox - MEGALOVANIA/` |
| 제목 | MEGALOVANIA |
| 아티스트 | toby fox |
| 출처 | Undertale |
| 비트맵 제작자 | Kyshiro |
| Beatmap Set ID | 387700 |
| 게임 모드 | osu!standard (`Mode: 0`) |
| 파일 형식 | osu file format v14 |
| 기본 BPM | 240 |
| 미리듣기 시작 | 15.984초 |
| 음원 | `toby fox - UNDERTALE Soundtrack - 100 MEGALOVANIA 192.mp3` |
| 배경 | `MUDCoPU.jpg` |
| 공유 스토리보드 | `Toby Fox - MEGALOVANIA (Kyshiro).osb` |
| 스토리보드 화면 | Widescreen (`WidescreenStoryboard: 1`) |
| 기본 샘플셋 | Normal |

음원 파일명에 포함된 `192`는 BPM 검증값이 아니다. 실제 `[TimingPoints]`의 기본 beat length 250ms를 기준으로 BPM 240을 사용한다.

### 3.2 난이도

| 난이도 | Beatmap ID | HP | CS | OD | AR | 전체 | Circle | Slider | Spinner | 첫 오브젝트 | 마지막 시작 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Easy | 848233 | 2.0 | 3.0 | 2.0 | 3.0 | 127 | 31 | 94 | 2 | 15.984s | 143.984s |
| Normal | 848235 | 3.0 | 3.2 | 3.0 | 5.0 | 190 | 66 | 121 | 3 | 15.984s | 143.984s |
| Irre's Light Hard | 882805 | 5.0 | 3.3 | 5.0 | 6.0 | 261 | 98 | 162 | 1 | 7.984s | 143.484s |
| Hard | 848234 | 5.2 | 3.8 | 7.2 | 8.3 | 386 | 137 | 246 | 3 | 7.984s | 143.984s |
| Insane | 847387 | 6.0 | 4.0 | 8.2 | 9.0 | 465 | 178 | 284 | 3 | 7.984s | 143.984s |

모든 난이도는 같은 음원과 배경을 사용하고 한 번의 break 구간을 포함한다. 난이도마다 SliderMultiplier, timing point, 내장 스토리보드와 오브젝트 구성이 다르므로 파일별 파싱 결과를 독립적으로 사용한다.

### 3.3 스킨

| 항목 | 실제 값 |
|---|---|
| 폴더 | 바깥쪽 `- YUGEN -/`의 직접 파일; 동일한 중첩 복제본은 제외 |
| 설정 파일 | `Skin.ini` |
| 설정 표기 | `Name: - YUGEN FINAL - Widescreen`, `Author: [Garin]`, `Version: 2.4` |
| 실제 파일 | PNG 561개, JPG 4개, WAV 50개, MP3 3개, `Skin.ini` 1개, 제외 대상 `Thumbs.db` 1개; 620개·28,427,094 byte |
| Standard 이미지 | Circle, Slider, Spinner, cursor, HUD, result 자산 포함 |
| 효과음 | Normal, Soft, Drum hitsound와 UI·Spinner 효과음을 주로 WAV로 포함; MP3는 `applause`, `failsound`, `ready` |
| 명시적 빈 시각 자산 | 완전 투명 PNG 36개; 그중 완전 투명 1×1 PNG 24개 |
| 명시적 무음 | 0바이트 `drum-sliderslide.wav`, `normal-sliderwhistle.wav` |
| 고해상도 자산 | 명시적 `@2x` PNG 227개; 모두 일반 counterpart 존재 |

`Skin.ini`는 정상적인 `[General]`로 시작하고 Mania 4–8K section도 포함한다. `HitCircleOverlayAboveNumer` 오타, 반복 `[Mania]`, duplicate `ColourHold`와 실제 파일 수를 초과하는 `SliderBallFrames: 60` 선언은 원본 그대로 보존한다. MVP는 duplicate key에 last-valid-value를 적용하고 unknown key를 추측 교정하지 않으며, Standard 외 section을 production dependency closure로 확장하지 않는다.

MVP가 사용하는 주요 Standard 자산은 다음과 같다.

| 기능 | 주요 자산 |
|---|---|
| 커서 | `cursor.png`, `cursor@2x.png`, 명시적으로 투명한 `cursortrail.png`, `cursor-smoke.png` |
| Circle | `hitcircle.png`, `hitcircleoverlay.png`, `approachcircle.png`, `default-0..9.png` |
| Slider | 정적 `sliderb0.png`, 투명 `sliderendcircle.png`, `sliderfollowcircle.png`, `reversearrow.png`, `sliderscorepoint.png`; 별도 start bitmap 없음 |
| Spinner | `spinner-*.png`, `spinnerbonus.wav`, `spinnerspin.wav`; 투명 layer는 그대로 숨김 |
| 연결 표시 | `followpoint-0..2.png`; unnumbered `followpoint.png` 없음 |
| 판정 | `hit300*`, `hit100*`, `hit50*`, `hit0*`, `combobreak.wav` |
| HUD | `score-*`, `scorebar-*`, `combo-x.png`, `inputoverlay-*` |
| 메뉴·선택 | `menu-*`, `selection-*`, `songselect-bottom.png`, `mode-osu*` |
| 일시정지·결과 | `pause-*`, `ranking-*`, `section-pass.png`, `section-fail.png` |

Taiko, Catch, Mania 및 modifier 이미지가 존재하더라도 MVP 화면에는 지원되는 Standard 기능만 노출한다.

`SliderBallFrames: 60`과 달리 실제 Slider Ball은 `sliderb0.png`와 `sliderb0@2x.png` 한 frame뿐이므로 이를 정적으로 사용하고 `sliderb1..59.png` URL을 만들지 않는다. `sliderstartcircle*`, `sliderendcircleoverlay*`와 unnumbered `followpoint.png`는 존재하지 않는다. Slider head는 canonical Hit Circle 역할을 재사용하고 tail은 present-but-transparent `sliderendcircle.png`가 fallback을 중단한다.

완전 투명 PNG 36개에는 `cursortrail.png`, `followpoint-0.png`, `sliderendcircle.png`, 여러 Spinner·ranking·scorebar layer와 `ready.png`가 포함된다. 이들은 누락이 아니라 해당 요소를 명시적으로 숨기는 유효 자산이다. `drum-sliderslide.wav`와 `normal-sliderwhistle.wav`는 0바이트 명시적 무음이므로 lookup 성공 뒤 audio fallback을 중단하고 decode하지 않는다.

일반 해상도와 명시적 `@2x` 자산은 하나만 선택해 같은 논리 크기로 그린다. YUGEN의 `@2x` PNG 227개는 모두 일반 counterpart가 있으며 `@2x`의 논리 크기는 pixel 크기의 절반이다. `@`가 없는 임의 `2x` 이름이나 숫자 suffix를 counterpart 또는 animation frame으로 추측하지 않는다.

맵 로컬 exact-case sample과 명시적 무음은 YUGEN WAV보다 우선한다. YUGEN의 동명 0바이트 WAV도 lookup 성공으로 간주하며 유사 이름·번호 suffix를 추측 대체하지 않는다.

### 3.4 스토리보드와 비트맵 자산

공유 `.osb`는 14개의 Sprite 또는 Animation, 1개의 Sample, Fade 13개, Move 138개와 Scale 12개 명령을 포함한다. 현재 공유 파일에서 필요한 명령은 `F`, `M`, `S`이며 `LoopForever` Animation도 사용한다.

각 `.osu` 파일은 난이도별 HP bar와 level 표시를 위한 Sprite 3개, Fade 9개, Move 3개와 Scale 3개를 추가한다. 따라서 선택 난이도와 공유 `.osb`를 합친 재생 단위는 객체 17개, Sample 1개, Fade 22개, Move 141개와 Scale 15개다.

전체 다섯 `.osu`와 공유 `.osb`에서 오디오·Animation frame을 확장한 자산 참조는 82건, 고유 경로는 65개이며 누락과 실제 파일명 대소문자 불일치는 없다. 앱은 공유 `.osb`와 선택한 `.osu`의 `[Events]`를 합성하고, `SB/` 이미지와 `sans burn in hell.wav`를 포함한 맵 전용 자산을 우선 사용해야 한다. 텍스트 참조가 없는 `SB/hp-burn.png`, `SB/hp-extra.png`, `SB/level-burn.png`, `SB/level-extra.png`는 MVP dependency closure에서 제외한다. 연출 오류가 판정이나 음악 시계를 중단시켜서는 안 된다.

## 4. 대상 사용자와 핵심 경험

### 4.1 대상 사용자

- 4Key 입력보다 마우스 조작을 선호하는 리듬게임 입문자
- 브라우저에서 설치 없이 osu!standard 방식의 플레이를 원하는 사용자
- 한 곡의 여러 난이도를 반복해 점수와 정확도를 높이고 싶은 사용자
- 향후 추가될 곡과 친구 대전을 원하는 사용자

### 4.2 핵심 사용자 흐름

1. 사용자가 웹 페이지에 접속한다.
2. 오디오 재생 허용을 위한 시작 버튼을 누른다.
3. MEGALOVANIA의 배경·제목·제작자와 다섯 난이도를 확인한다.
4. 난이도를 선택하고 필요하면 오프셋, 음량, 배경 밝기, 커서와 키를 조정한다.
5. 필수 음원·맵·스킨·스토리보드 자산의 로딩 진행률을 확인한다.
6. 준비 화면 후 음악과 스토리보드가 시작된다.
7. Circle을 클릭하고 Slider를 따라가며 Spinner를 회전한다.
8. 플레이 중 점수, 콤보, 정확도, HP와 진행률을 확인한다.
9. 완주하거나 HP가 0이 되어 실패하면 결과를 확인한다.
10. 같은 난이도를 재도전하거나 다른 난이도를 선택한다.

## 5. 기능 요구사항

### FR-01 시작 및 리소스 로딩

- 첫 사용자 입력 이후에만 AudioContext를 활성화한다.
- 콘텐츠 카탈로그, 선택한 `.osu`, 음원, 배경, 스킨 필수 자산, 공유·내장 스토리보드와 해당 자산을 로딩한다.
- 전체 진행률과 현재 로딩 중인 리소스 종류를 표시한다.
- 플레이 필수 리소스와 선택적 연출 리소스를 구분한다.
- 음원 또는 `.osu` 로딩 실패 시 플레이를 시작하지 않고 파일 종류와 재시도 동작을 제공한다.
- 배경·스토리보드·선택적 효과음 실패 시 폴백을 사용하고 플레이는 계속할 수 있다.
- manifest가 명시적 무음으로 분류한 0바이트·zero-data WAV는 decode하지 않고 정상적인 무음으로 처리하며 다른 소리로 fallback하지 않는다.
- 현재 재생에 필요한 비PCM WAV는 지원 브라우저에서 decode 가능함을 검증하고, 불가능하면 호환 사본을 준비하거나 해당 효과를 명시적으로 비활성화한다.
- 같은 세션의 재도전에서는 디코딩한 음원과 이미지 자산을 재사용한다.

### FR-02 곡 및 난이도 선택

- MVP의 곡 목록에는 MEGALOVANIA 한 곡만 표시한다.
- Easy, Normal, Irre's Light Hard, Hard, Insane을 모두 선택할 수 있다.
- 난이도별 HP, CS, OD, AR와 Circle·Slider·Spinner 수를 표시한다.
- 15.984초부터 미리듣기를 시작하고 중지할 수 있다.
- 마지막으로 선택한 난이도를 브라우저에 저장한다.
- 화면은 단일 곡에 최적화하되 내부적으로 콘텐츠 카탈로그의 항목을 렌더링한다.
- 곡 선택 section은 viewport 전체를 사용하며 beatmap의 Sans 배경 이미지를 뒤에 표시하지 않는다. 다섯 난이도는 선택 항목을 중심으로 이동하는 YUGEN 이미지 기반 carousel로 표시하고, 이전·다음 화살표, 카드 클릭, 키보드와 wheel 선택을 지원한다. 선택 변경 시 카드가 즉시 교체되지 않고 좌우 이동 motion으로 새 중심 위치에 도달해야 한다.
- 선택 화면의 실제 비트맵 배경, dim, blur, 제목과 난이도 panel은 선택 변경에 맞춰 짧게 전환하며 `prefers-reduced-motion`을 존중한다.
- 난이도 이동·확정·뒤로가기는 YUGEN의 `menuhit.wav`, `menuclick.wav`, `menuback.wav`를 효과음 음량으로 재생하고, 장면 전환은 `whoosh.wav`를 사용할 수 있다. 첫 사용자 gesture 전에는 재생하지 않는다.

### FR-03 입력

- 플레이 커서는 실제 마우스 위치를 사용한다.
- 기본 입력은 마우스 좌·우 버튼과 `Z`·`X` 키다.
- 네 입력은 독립된 press/release 채널이지만 오브젝트 판정에는 동등하게 사용한다.
- 이미 다른 채널을 누르고 있어도 새 채널의 press는 독립된 판정 시도다. 한 physical press는 판정 가능한 오브젝트 하나만 시작시킨다.
- Slider와 Spinner의 hold는 하나 이상의 채널이 눌린 상태다. 한 채널을 놓아도 다른 채널이 눌려 있으면 hold를 유지한다.
- 키보드 자동 반복은 새로운 클릭으로 처리하지 않는다.
- 플레이 중 우클릭 브라우저 메뉴를 차단하고 메뉴 화면에서는 정상 동작하게 한다.
- 브라우저 포커스를 잃거나 탭이 숨겨지면 눌림 상태를 초기화하고 자동으로 일시정지한다.
- 플레이 영역 안에서는 시스템 커서를 숨기고 스킨 커서를 표시하며 메뉴에서는 시스템 커서를 복원한다.
- 기본 `Z`·`X`는 설정에서 서로 중복되지 않는 키로 변경할 수 있다.

### FR-04 Hit Circle

- Circle은 AR에 맞춰 나타나고 Approach Circle이 타격 시점까지 축소된다.
- CS에 맞는 크기와 비트맵 또는 스킨의 콤보 색상을 사용한다.
- 커서가 Circle의 유효 반경 안에 있고 유효 입력 전이가 발생했을 때만 판정한다.
- 입력 시각과 오브젝트 시각의 차이에 따라 300, 100, 50을 부여한다.
- 50 판정 구간까지 입력되지 않은 Circle은 Miss 처리한다.
- 같은 위치와 가까운 시간에 배치된 오브젝트는 TRD의 프로젝트 stacking과 notelock 규칙을 적용한다.

### FR-05 Slider

- Linear, Bezier, Centripetal Catmull-Rom과 Perfect Circle 경로를 지원한다.
- Slider head, body, ball, follow circle, tick, repeat, reverse arrow와 tail을 표시한다.
- SliderMultiplier, timing point, inherited slider velocity와 SliderTickRate를 반영한다.
- 사용자는 Slider head를 유효 시각에 누르고, 입력을 유지한 채 Slider Ball의 허용 범위를 따라가야 한다.
- Slider head, tick, repeat와 tail을 각각 추적해 콤보, 점수와 최종 Slider 판정을 계산한다.
- 일부 part를 놓친 경우 레거시 Slider leniency와 Slider break 규칙을 적용한다.
- 경로 밖에 잠시 나가더라도 해당 순간에 판정 part가 없다면 즉시 전체 Miss로 처리하지 않는다.
- Slider 진행 중 스킨의 slide·whistle 효과음과 edge hitsound를 맵 설정에 맞춰 재생하되, 맵이나 스킨의 명시적 무음 파일은 그대로 존중한다.

### FR-06 Spinner

- Spinner 시작부터 종료까지 화면 중앙에 스킨 Spinner 자산과 남은 시간·진행 상태를 표시한다.
- 하나 이상의 입력 채널을 누른 상태에서 커서를 어느 방향으로든 원형으로 움직이면 회전량을 누적한다.
- 비정상적으로 큰 단일 포인터 이동이 회전량을 과도하게 증가시키지 않도록 회전 계산을 제한한다.
- Spinner 길이와 OD를 기준으로 필요한 회전량과 300, 100, 50, Miss를 결정한다.
- clear 이후 추가 회전에는 ScoreV1 Spinner bonus와 HP 회복을 적용한다.
- 입력이 해제된 동안에는 회전량을 누적하지 않는다.

### FR-07 판정 순서와 시간 보정

- Standard 판정은 300, 100, 50, Miss 네 단계로 제공한다.
- OD별 판정 구간은 osu!stable Standard 공식을 따른다.
- 한 입력은 판정 가능한 가장 이른 오브젝트 하나만 시작시킬 수 있다.
- 앞선 오브젝트가 판정 가능한 동안 뒤 오브젝트가 부당하게 먼저 판정되지 않도록 notelock을 적용한다.
- 한 오브젝트와 각 Slider part는 정확히 한 번만 판정한다.
- 사용자 오프셋은 렌더링과 입력 판정에 함께 적용한다. 양수는 맵의 표시·판정을 음악보다 앞당기고 음수는 늦춘다.
- 규칙 변경 시 기존 기록과 섞이지 않도록 ruleset version을 올린다.

### FR-08 점수·콤보·정확도·HP·랭크

- 점수는 ScoreV1 방식을 참고한 TRD의 프로젝트 점수 규칙을 사용한다.
- Circle·Slider·Spinner의 최종 300/100/50 판정과 Slider part·Spinner bonus를 점수에 반영한다.
- 성공한 Circle과 Slider part는 콤보를 증가시키고 Miss 또는 Slider break는 규칙에 따라 콤보를 끊는다.
- 현재 콤보와 최대 콤보를 별도로 관리한다.
- 정확도는 300, 100, 50, Miss 수로 계산한다.
- HPDrainRate, break 구간과 판정 결과에 따라 HP가 감소·회복한다.
- HP가 0이 되면 플레이를 종료하고 Failed 결과를 표시한다.
- 결과 랭크는 최종 오브젝트 판정 수를 기준으로 다음 osu!standard 조건을 적용한다.

| 랭크 | 조건 |
|---|---|
| SS | 정확도 100% |
| S | 300 비율 90% 초과, 50 비율 1% 이하, Miss 없음 |
| A | 300 비율 80% 초과이며 Miss 없음, 또는 300 비율 90% 초과 |
| B | 300 비율 70% 초과이며 Miss 없음, 또는 300 비율 80% 초과 |
| C | 300 비율 60% 초과 |
| D | 그 외 |

- HP 상수와 drain 곡선은 TRD에 정의한 프로젝트 규칙으로 고정하고 현재 다섯 HP 값의 자체 회귀 fixture로 검증한다.
- MVP에는 modifier가 없으므로 mod multiplier는 1.0으로 고정한다.

### FR-09 플레이 화면과 스킨

- 비트맵의 512×384 플레이필드 위치 관계를 화면 비율과 관계없이 유지한다.
- 현재 콘텐츠의 Background, Fail, Pass, Foreground 스토리보드는 내부 레이어 순서를 보존해 게임 오브젝트 아래에 합성한다.
- 후속 콘텐츠에서 Overlay를 지원할 때는 게임 오브젝트 위이면서 HP·커서 등 스킨 HUD 아래에 합성한다.
- 배경과 게임 오브젝트 아래 Storyboard에는 사용자가 설정한 dim을 적용해 오브젝트 가독성을 확보한다.
- 스킨의 Circle, Slider, Spinner, follow point, cursor, hit result와 hitsound를 사용한다.
- 스킨의 콤보 색은 `Combo1..5`의 파랑·보라·하늘·초록·분홍을 순환하고, Slider body는 `SliderTrackOverride: 3,3,12`와 `SliderBorder: 190,190,190`을 사용한다.
- 투명 placeholder와 비어 있는 Spinner layer를 누락으로 바꾸거나 임의 기본 그래픽으로 대체하지 않는다.
- 시스템 커서를 숨기고 밝은 cyan `cursor.png`를 최상단에 그린다. `cursortrail.png`는 명시적으로 투명하므로 임의 Canvas trail을 생성하지 않는다.
- 1280×720 기준 Standard 512×384 좌표는 scale 1.5와 offset `(256,72)`, Storyboard 640×480 좌표는 scale 1.5와 offset `(160,0)`을 사용한다. 다른 viewport에서도 두 좌표계를 독립적으로 균일 확대한다.
- 상단의 얇은 HP bar, 우상단 score·accuracy, 좌측 판정 누계, 우측 K1/K2/M1/M2 overlay, 좌하단 combo와 하단 중앙 timing bar를 `play.mp4` 배치에 맞춘다.
- 동일한 canonical 자산명이 있으면 맵 로컬 자산을 스킨보다 우선하며, 현재 콘텐츠의 `fail-background.png`, `failsound.wav`, `normal-hitclap.wav`, `normal-hitwhistle.wav`, `soft-sliderslide.wav`에 적용한다.
- 점수, 콤보, 정확도, HP, 진행률과 입력 상태를 표시한다.
- 스킨 파일이 없으면 기능별 기본 도형·텍스트·무음 폴백을 사용한다.
- 지원하지 않는 모드나 modifier 버튼은 자산이 존재하더라도 노출하지 않는다.

### FR-10 스토리보드

- 공유 `.osb`와 선택 난이도의 `[Events]` 내 스토리보드를 함께 재생한다.
- 현재 콘텐츠의 Sprite, Animation, Sample과 Fade, Move, Scale 명령을 모두 지원한다.
- Background, Fail, Pass, Foreground 레이어의 내부 순서를 보존한다.
- 같은 레이어에서는 선택 난이도의 `.osu` 객체 순서 뒤에 공유 `.osb` 객체를 이어 붙인 것처럼 합성해 `.osb`가 나중에 그려지게 한다.
- Animation의 프레임 속도와 `LoopForever` 반복을 지원한다.
- 스토리보드 시간은 음악과 같은 오디오 기준 시계를 사용한다.
- `SB/`의 이미지와 맵 루트의 스토리보드 사운드를 지원한다.
- 사용자는 설정에서 스토리보드를 끌 수 있으며 점수에는 영향을 주지 않는다.
- 누락된 자산·지원하지 않는 명령은 경고 후 해당 연출만 생략한다.

### FR-11 일시정지·실패·결과

- `Escape`로 일시정지하며 계속하기, 처음부터 재시작, 난이도 선택으로 이동할 수 있다.
- 일시정지 중 음악, 게임 시간, 오브젝트와 스토리보드가 모두 정지한다.
- 탭 숨김, 오디오 장치 중단 또는 플레이 중 전체 화면 해제가 발생하면 자동으로 일시정지한다. 재개에는 명시적 사용자 입력이 필요하다.
- 재개 전 짧은 준비 안내를 제공하되 판정 시간을 변경하지 않는다.
- HP가 0이면 실패 효과와 재시작·난이도 선택 동작을 제공한다.
- 완주 결과에는 점수, 정확도, 최대 콤보, 300/100/50/Miss 수, Slider break, Spinner bonus와 랭크를 표시한다.
- 최고 기록 갱신 여부를 표시한다.
- 곡 선택·로딩·플레이·결과 사이의 전환 효과는 판정 시계와 독립적이어야 하며, 중복 입력이나 stale load를 만들지 않아야 한다.
- 결과는 YUGEN ranking·section·panel 이미지를 사용하고 점수 집계와 rank reveal을 제공하되 즉시 건너뛸 수 있어야 한다.
- 완주 결과 dialog는 viewport 전체를 사용한다. YUGEN `ranking-panel.png`는 비율을 유지해 왼쪽에 배치하고, 실제 점수·정확도·콤보·판정 정보와 동작 버튼은 스킨에 인쇄된 `SCORE`·`COMBO`·`ACCURACY` 문구를 가리지 않는 별도 오른쪽 열에 배치한다.

### FR-12 설정

- 입력 오프셋을 밀리초 단위로 조정할 수 있다.
- 마스터, 음악, 효과음과 스토리보드 사운드 음량을 조정할 수 있다.
- 배경 dim, 스토리보드 표시, 커서 크기와 커서 트레일을 설정할 수 있다.
- `Z`·`X` 보조 키를 변경할 수 있으며 중복 키를 허용하지 않는다.
- 전체 화면 진입·해제를 제공하되 전체 화면이 아니어도 모든 기능이 동작해야 한다.
- 기본값 복원 기능을 제공한다.
- 상세 판정·timing bar, 입력 overlay와 FPS 진단 표시를 각각 켜고 끌 수 있다. 점수·accuracy·combo·HP 핵심 HUD와 실제 판정 결과에는 영향을 주지 않는다.
- 설정은 브라우저에 저장하고 다음 방문에 복원한다.

### FR-13 로컬 기록

- 기록은 song ID, Beatmap ID와 ruleset version 조합으로 구분한다.
- 난이도별 최고 점수, 최고 정확도, 최대 콤보와 달성 시각을 저장한다.
- 최고 점수가 높은 결과를 우선하며 동점이면 정확도, 최대 콤보 순으로 비교한다.
- 손상되거나 구버전인 저장 데이터는 마이그레이션하거나 안전한 기본값으로 복구한다.
- LocalStorage를 사용할 수 없어도 현재 세션 플레이는 계속할 수 있다.

### FR-14 여러 곡 확장

- 게임 엔진과 UI가 MEGALOVANIA의 파일명을 직접 하드코딩하지 않는다.
- 곡, 비트맵, 오디오, 배경, 스토리보드와 난이도 경로는 콘텐츠 카탈로그와 곡 manifest에서 읽는다.
- 새 곡 추가는 검증된 콘텐츠 폴더와 카탈로그 항목 추가로 가능해야 한다.
- 곡별 스토리보드·샘플셋·난이도 수가 달라도 같은 파서와 게임 규칙을 사용한다.
- 지원하지 않는 mode 또는 필수 필드가 없는 곡은 카탈로그 검증 단계에서 비활성화한다.

### FR-15 온라인 확장

- 온라인 기능을 추가하기 전까지 싱글 플레이 전체가 서버 없이 동작해야 한다.
- 리더보드 도입 시 Beatmap ID와 ruleset version이 같은 기록만 비교한다.
- 1대1 대전은 각 브라우저에서 로컬 판정하고 상대의 진행 정보와 최종 결과만 교환한다.
- 온라인 기능 실패가 로컬 곡 선택이나 싱글 플레이를 막지 않아야 한다.

## 6. 비기능 요구사항

### 6.1 성능

- 1920×1080의 최신 Chrome·Edge에서 플레이 중 60FPS를 목표로 한다.
- 준비 완료 후 일반 플레이에서 33.3ms를 넘는 긴 프레임 비율을 1% 미만으로 유지한다.
- Insane의 465개 오브젝트와 현재 스토리보드를 동시에 처리할 수 있어야 한다.
- 화면에 보이지 않는 오브젝트와 활성 시간이 아닌 스토리보드 객체는 그리지 않는다.
- 게임 시간은 프레임 누적값이 아니라 오디오 시계를 기준으로 한다.
- 재도전과 장면 전환을 반복해도 AudioBuffer, 이벤트 리스너와 애니메이션 루프가 누적되지 않아야 한다.

### 6.2 호환성과 사용성

- 최신 Chrome과 Edge를 필수 지원하고 Firefox를 검증 대상에 포함한다.
- 최소 화면 폭 1024px의 마우스·키보드가 연결된 PC를 대상으로 한다.
- 창 크기가 바뀌어도 512×384 플레이필드 비율과 입력 좌표가 일치해야 한다.
- 메뉴는 마우스와 키보드 포커스로 조작할 수 있어야 한다.
- 로딩, 일시정지, 실패와 오류 상태를 색상만으로 전달하지 않는다.
- 스토리보드 비활성화와 배경 dim으로 시각적 자극과 가독성을 조절할 수 있어야 한다.

### 6.3 안정성과 보안

- 리소스 오류가 빈 화면이나 입력 불능으로 이어지지 않아야 한다.
- 콘텐츠 경로는 허용된 곡·스킨 루트 밖으로 이동할 수 없게 검증한다.
- 파일명은 Windows와 Vercel의 대소문자 차이를 고려해 manifest의 실제 이름과 일치시킨다.
- MVP는 서버 전송과 개인정보 수집을 하지 않는다.
- 온라인 기능 도입 전에는 비밀 키나 service role 자격 증명을 브라우저 번들에 포함하지 않는다.

### 6.4 배포와 네트워크

- MVP는 Vite production build로 생성한 정적 파일을 Vercel에 배포한다.
- 앱 셸은 먼저 표시하고 큰 음원·이미지·스토리보드 자산은 진행률과 함께 로딩한다.
- `.osu`, `.osb`, MP3, WAV, PNG, JPG가 Vercel에서 직접 요청 가능해야 한다.
- 해시된 앱 번들과 버전이 포함된 콘텐츠는 장기 캐시하고, 콘텐츠 카탈로그는 갱신을 확인할 수 있어야 한다.
- production 산출물에는 manifest가 허용한 Standard 플레이·현재 스토리보드 자산만 포함하며 `desktop.ini`, `Thumbs.db`와 미사용 모드 자산은 제외한다.
- 첫 한 곡 production 산출물은 앱 번들을 포함해 35 MiB 이하를 예산으로 삼고 build report에 파일별·유형별 크기를 기록한다.
- 느린 네트워크에서도 중복 다운로드를 피하고 실패한 개별 리소스를 재시도할 수 있어야 한다.

## 7. 개발 및 출시 단계

### 0단계: 프로젝트 규칙 기준 고정

- 다섯 `.osu`, 공유 `.osb`, `skin.ini`와 실제 자산의 해시·통계를 고정한다.
- ScoreV1 방식, Slider leniency, Spinner와 HP에 사용할 프로젝트 상수·반올림·경계 규칙을 TRD에 고정한다.
- 자체 회귀 fixture는 구현 전에 기대 결과를 작성하고 `RULESET_VERSION`과 map SHA-256을 기록한다.
- 외부 osu!stable 관측값은 확보되는 경우 차이 분석에만 사용하며 구현이나 release를 차단하지 않는다.

### 1단계: 실제 콘텐츠 검증과 플레이 코어

- 다섯 `.osu` 파일과 `skin.ini`, `.osb`를 파싱한다.
- Circle, Slider, Spinner, 판정, ScoreV1, 콤보, 정확도와 HP를 완성한다.
- 오디오 시계, 마우스·키보드 입력과 Canvas 렌더링을 연결한다.

### 2단계: 한 곡 싱글 플레이 MVP

- 시작, 난이도 선택, 설정, 로딩, 플레이, 일시정지, 실패와 결과 흐름을 완성한다.
- `- YUGEN -` 스킨, `play.mp4`의 presentation 기준과 현재 스토리보드를 적용한다. `gameex.md`는 구현 전에 같은 기준으로 개정한다.
- 로컬 최고 기록과 오류 폴백을 완성한다.
- Chrome·Edge·Firefox에서 정해진 수동 브라우저 체크리스트와 짧은 smoke 절차로 다섯 난이도를 검증한다.

### 3단계: 로컬 release candidate와 선택적 Vercel 배포

- 기능·규칙·성능 gate를 통과하면 공개 권리와 관계없이 로컬 release candidate를 완료할 수 있다.
- 공개 전 콘텐츠 사용·수정·재배포 권리를 파일군별로 확인한다. 하나라도 승인되지 않으면 Vercel 업로드와 공개 배포를 중단하고 로컬 release candidate로 종료한다.
- 모든 파일군의 권리가 승인된 뒤에만 MEGALOVANIA 한 곡을 Vercel에 배포한다.
- 직접 자산 요청, MIME·Range·캐시, 새로고침, 오디오 권한과 실제 성능을 검증한다.

### 4단계: 여러 곡

- 검증된 곡 폴더와 manifest를 카탈로그에 추가한다.
- 곡 목록, 검색·정렬과 곡별 기록 UI를 확장한다.
- 기존 MEGALOVANIA 회귀 테스트를 유지한다.

### 5단계: 온라인 기능

- 익명 사용자와 난이도별 리더보드를 추가한다.
- 이후 방 코드 기반 1대1 대전을 추가한다.

## 8. MVP 완료 기준

- 실제 다섯 `.osu`의 메타데이터와 오브젝트 수가 자동 검증값과 일치한다.
- 다섯 난이도에서 Circle, Slider, Spinner가 결과 또는 실패 화면까지 정상 동작한다.
- AR, OD, CS와 timing point가 표시·판정·Slider 진행에 반영된다.
- 마우스 좌·우 버튼과 `Z`·`X`가 같은 규칙으로 판정된다.
- 한 채널을 누른 상태의 다른 채널 press가 새 판정을 시도하고, 일부 채널 release 뒤에도 남은 채널로 Slider·Spinner hold가 유지된다.
- ScoreV1 방식의 점수, 정확도, 콤보와 랭크 경계가 프로젝트 회귀 fixture와 일치한다.
- HP 2, 3, 5, 5.2, 6의 drain·회복·break·실패 경계가 프로젝트 회귀 fixture와 일치한다.
- 공유 `.osb`의 14개 객체와 선택 난이도의 내장 객체가 올바른 시간·레이어로 재생된다.
- 전체 Storyboard·오디오 참조 82건의 고유 경로 65개가 실제 대소문자로 해석되고 누락 없이 로딩된다.
- 같은 Storyboard 레이어에서 `.osu` 객체 뒤에 `.osb` 객체가 그려지고 Foreground가 게임 오브젝트를 가리지 않는다.
- 스토리보드 사운드를 포함한 맵·스킨 효과음이 음악 시계를 방해하지 않는다.
- 정상 `[General]`, 반복 Mania section, duplicate key last-valid-value, 오타 key 무시, 정적 `sliderb0.png`, 완전 투명 PNG 36개, `@2x` 227개와 비표준 이름이 스킨 전체 실패나 잘못된 fallback을 만들지 않는다.
- YUGEN의 0바이트 WAV 2개와 맵 로컬 명시적 무음이 lookup 성공 뒤 fallback과 `decodeAudioData()`를 중단한다.
- 1280×720에서 Standard `(256,72,768×576)`와 Storyboard `(160,0,960×720)`가 각각 정렬되고 inverse pointer transform이 Standard 좌표로 왕복한다.
- `play.mp4`의 준비 표시, gameplay HUD, break storyboard 합성, cyan cursor와 투명 trail이 구현된다. 완료 후 YUGEN Ranking은 사용자가 승인한 `standard 결과물.jpg`처럼 전체 배경 위 왼쪽 통계 panel, 오른쪽 대형 rank, 오른쪽 아래 Retry/Back 동작으로 구성한다. 참고 이미지의 점수·판정·정확도 값은 완료 fixture로 하드코딩하지 않는다.
- 일시정지·재개·재시작 후 시간, 입력과 판정 상태가 중복되거나 건너뛰지 않는다.
- 최신 Chrome·Edge에서 60FPS 목표를 충족하고 Firefox에서 완주할 수 있다.
- 자동 브라우저 E2E suite는 MVP 완료 조건이 아니다. 버전이 고정된 브라우저 체크리스트의 모든 필수 case를 실행하고 case별 기대 결과·실제 결과·증거 파일·검증자를 release evidence manifest에 남긴다.
- 설정과 최고 기록이 새로고침 후 복원된다.
- 로컬 release candidate 완료와 Vercel 공개 승인을 별도 상태로 표시한다. 공개 권리가 승인된 경우에만 Vercel Production을 만들고 URL에서 새로고침과 모든 정적 자산의 MIME·Range·캐시 계약을 검증한다.
- 콘텐츠 카탈로그는 한 곡만 포함하지만 두 번째 곡을 engine JavaScript 변경 없이 추가할 계약을 갖는다.

## 9. 성공 지표

- 다섯 난이도의 로딩 성공률과 치명적 오류 없는 세션 비율
- 입력·오디오 동기화 관련 사용자 보고 수
- 난이도별 완주율, 실패 지점과 재도전 비율
- 플레이 중 평균 FPS와 33.3ms 이상 긴 프레임 비율
- Slider break와 Spinner 입력 이상 발생률
- Vercel 자산 요청 실패율과 재방문 시 캐시 적중률
- 난이도별 최고 기록 갱신과 반복 플레이 비율

## 10. 콘텐츠 및 권리 전제

현재 포함된 음원, 비트맵, 배경, 스토리보드와 스킨은 개발용 리소스로 취급한다. Vercel 공개 배포 전에 각 리소스의 사용·수정·재배포 허가를 프로젝트 담당자가 확인해야 한다.

권리 확인 결과는 음원, 비트맵, 배경·스토리보드, 스킨별로 출처·권리자·허가 범위·확인 일자를 남긴다. 확인 전에는 로컬 개발과 접근 제한 Preview만 허용하며 공개 Production gate는 실패해야 한다.

제품은 osu!의 공식 서비스가 아니며 osu! 또는 원 저작권자의 보증·제휴를 주장하지 않는다. 제품 이름과 안내 문구에서도 공식 클라이언트로 오인될 표현을 사용하지 않는다.

## 11. PRD-TRD 추적성

| 제품 요구사항 | 주요 기술 계약 |
|---|---|
| FR-01 시작 및 로딩 | TRD 11, 20, 23 |
| FR-02 곡 및 난이도 선택 | TRD 7, 18, 20 |
| FR-03 입력 | TRD 10, 12, 22 |
| FR-04 Hit Circle | TRD 13, 14.1, 15, 17 |
| FR-05 Slider | TRD 9.4, 10.5, 14.2, 15, 17 |
| FR-06 Spinner | TRD 14.3, 15, 17 |
| FR-07 판정 순서와 시간 보정 | TRD 11.2, 12, 13 |
| FR-08 점수·콤보·정확도·HP·랭크 | TRD 15, 22 |
| FR-09 플레이 화면과 스킨 | TRD 10, 17, 18, 21 |
| FR-10 스토리보드 | TRD 16, 20, 22 |
| FR-11 일시정지·실패·결과 | TRD 11.3, 18, 20, 22 |
| FR-12 설정 | TRD 11, 12, 19 |
| FR-13 로컬 기록 | TRD 19 |
| FR-14 여러 곡 확장 | TRD 7, 24 |
| FR-15 온라인 확장 | TRD 25 |
| 성능·안정성·배포·권리 | TRD 20, 21, 22, 23 |
