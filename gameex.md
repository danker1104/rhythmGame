# MEGALOVANIA Hard 플레이 구현 기준

> 기준 영상: `play.mp4`  
> 분석일: 2026-08-29  
> 대상 비트맵: `toby fox - MEGALOVANIA [Hard]`, Beatmap by Kyshiro  
> 역할: 게임 플레이의 시각 구성, 사용자 피드백과 결과 표현 기준

## 1. 문서의 위치와 한계

이 문서는 사용자가 선택한 플레이 영상에서 확인한 게임 형식을 구현 가능한 계약으로 정리한다. `PRD.md`의 제품 범위와 `TRD.md`의 판정·시간·점수·좌표 계약을 변경하지 않는다. 충돌 시 PRD와 TRD가 우선한다.

영상은 한 번의 실제 플레이 결과다. 따라서 아래 항목은 presentation 참고값이지 회귀 baseline이 아니다.

- 영상에 찍힌 점수, 정확도, 콤보, 판정 수와 랭크
- 플레이어의 입력 오차, UR와 miss 위치
- `pp`, UR와 입력 trace 같은 상세 통계
- 영상의 압축, 녹화 프레임과 커서 보간

오브젝트 종류·좌표·시각, Slider path, timing point와 storyboard는 원본 `.osu`·`.osb`를 파싱해 생성한다. 영상 프레임을 게임 데이터로 역추출하지 않는다.

## 2. 영상 검증값

| 항목 | 값 |
|---|---|
| 파일 | `play.mp4` |
| 영상 크기 | 1280×720 |
| 길이 | 약 147.18초 |
| 모드 | osu!standard |
| 난이도 | Hard, Beatmap ID 848234 |
| 흐름 | 준비 표시 → 본 플레이 → break·Spinner 포함 → Ranking |

영상에 표시되는 replay score, accuracy, max combo, 300/100/50/Miss, rank, UR와 pp는 presentation 확인용이며 구현 acceptance fixture로 사용하지 않는다. 판정·ScoreV1·HP·오브젝트·시간 공식은 `TRD.md`와 프로젝트 회귀 fixture만 따른다.

## 3. 화면 구성

- 출력은 16:9 viewport를 기준으로 하되 실제 Standard playfield는 4:3 비율을 유지한다.
- 512×384 게임 좌표를 균일 확대하고 playfield 밖에 HUD와 입력 오버레이를 배치한다.
- 배경과 storyboard는 전체 화면을 채우며 플레이 중 어둡게 처리해 hit object를 우선해서 읽을 수 있게 한다.
- 한 gameplay Canvas 안의 순서는 storyboard underlay, hit object, storyboard Overlay, HUD, cursor다. 설정·일시정지·결과 조작은 semantic HTML로 제공할 수 있다.
- viewport가 달라져도 playfield를 비균일 확대하지 않고 HUD가 hit object 판정 영역을 바꾸지 않게 한다.

### HUD 배치

- 좌상단: 가로 HP bar
- 상단 중앙: 정확도
- 우상단: 고정 폭 점수 숫자
- 좌측: 300/100/50 등 현재 판정 누계
- 좌하단: 큰 현재 combo
- 하단 중앙: 선택적 UR/timing 분포 표시
- 우측: K1, K2, M1, M2 입력 overlay와 입력 feedback

UR/timing 분포와 pp는 핵심 판정 규칙이 아니다. 개발·상세 통계 기능으로 격리하고, 비활성화해도 플레이와 결과가 완전해야 한다.

## 4. Hit Circle 표현

- Circle은 어두운 반투명 내부, 밝은 외곽과 콤보 색 테두리를 사용한다.
- Approach Circle은 오브젝트보다 크게 나타나 hit time에 맞춰 Circle 크기로 수축한다.
- 다음 오브젝트가 미리 겹쳐 나타나더라도 시간순 판정과 notelock은 renderer가 아니라 rules engine이 결정한다.
- hit 직후 `300`, `100`, `50`, `X` 결과 sprite를 짧게 표시한다.
- 실제 색과 bitmap은 바깥쪽 `- YUGEN -/Skin.ini`에서 생성한 `/skins/v3/yugen/` manifest 자산을 사용한다.

## 5. Slider 표현과 상호작용

- Slider body는 어두운 track 내부와 구분되는 border를 사용한다.
- head, repeat, tail과 follow circle을 명확히 표시한다.
- repeat 지점에는 `reversearrow.png`를 표시하고 실제 span 방향 전환과 동기화한다.
- Slider Ball과 cursor가 겹쳐 보여도 서로 다른 상태다. Ball은 map time으로 path를 이동하고 cursor는 사용자의 실제 pointer를 따른다.
- 하나 이상의 입력 channel이 active이고 cursor가 follow 범위 안일 때만 hold가 유지된다.
- frame drop이 있어도 tick, repeat와 tail을 빠뜨리지 않고 elapsed map time 전체를 처리한다.

## 6. Spinner 표현과 상호작용

- Spinner는 playfield 중앙에 큰 원형 영역과 진행 상태를 표시한다.
- cursor의 원형 이동을 누적해 회전량을 계산한다.
- Spinner 시각 회전과 결과 판정은 동일한 map time snapshot을 사용하되 renderer가 결과를 결정하지 않는다.
- 배경은 유지하되 Spinner와 cursor의 대비를 충분히 확보한다.

## 7. Cursor와 입력 피드백

- 플레이 영역에서는 시스템 커서를 숨기고 스킨 cursor를 사용한다.
- cyan YUGEN cursor를 사용한다. `cursortrail.png`는 의도적으로 투명한 자산이므로 다른 trail로 대체하지 않는다.
- mouse-left, mouse-right, KeyZ, KeyX는 독립 press/release channel이다.
- 입력 overlay는 각 channel의 현재 hold 또는 press feedback을 보여준다. 표시용 누계가 판정 입력을 다시 생성해서는 안 된다.
- keyboard repeat는 새 press가 아니며 focus loss, hidden, audio interruption과 fullscreen exit 때 hold를 지우고 pause한다.

## 8. 준비·Break·결과 화면

- 시작 전에 시선을 중앙에 모으는 준비 표시를 제공하고 첫 오브젝트 전 lead-in을 보존한다.
- break 중에는 hit object를 만들지 않지만 배경·storyboard·HP와 필요한 HUD는 유지한다.
- 완주 또는 실패 뒤 gameplay 입력을 중단하고 결과 화면으로 전환한다.
- 결과 화면에는 최소한 점수, 300/100/50/Miss, max combo, accuracy와 rank를 표시한다.
- 영상의 Geki, Katu, UR graph와 pp는 선택적 상세 정보다. 구현하더라도 핵심 ScoreV1 결과와 구분한다.

## 9. 오디오와 동기화

- 음악, hit object, cursor-follow 효과, storyboard와 HUD 갱신은 Web Audio 기반 map time 하나를 공유한다.
- `requestAnimationFrame`은 표시 신호일 뿐 시간 원본이 아니다.
- 한 frame에서 map time을 한 번 읽고 update와 render에 같은 값을 전달한다.
- hitsound는 map-local 자산, `- YUGEN -` skin 자산, application fallback 순서로 찾는다.
- map-local 명시적 무음은 skin MP3 fallback을 중단한다.

## 10. 구현 검증 체크리스트

- Hard의 첫 오브젝트부터 마지막 오브젝트까지 Circle, Slider와 Spinner가 원본 map time에 맞춰 진행된다.
- 16:9, 4:3, 1024×768 viewport에서 4:3 playfield가 찌그러지지 않는다.
- Approach Circle 수축, hit result, Slider Ball·repeat arrow와 Spinner 진행이 AudioClock에 동기화된다.
- cursor와 trail이 active skin 자산으로 표시되고 pointer inverse transform과 일치한다.
- HP, accuracy, score, combo와 입력 overlay가 playfield 판정 좌표를 침범하지 않는다.
- miss와 Slider break가 프레임 누락 없이 즉시 시각 피드백과 rules event를 만든다.
- Ranking 화면의 합계가 실제 rules result와 일치하고 영상에 찍힌 특정 결과값을 하드코딩하지 않는다.
- 배경·storyboard 실패가 음악이나 gameplay rules를 중단하지 않는다.

## 11. 구현 제외 항목

- 외부 렌더 서버 또는 osu! 온라인 API 연동
- 공식 replay 호환이나 영상 재생 기반의 autoplayer
- pp 계산을 MVP 완료 조건으로 추가하는 것
- 영상 속 플레이어 입력을 정답 trace로 사용하는 것
- 영상의 1280×720 pixel 위치를 다른 viewport에 그대로 하드코딩하는 것
