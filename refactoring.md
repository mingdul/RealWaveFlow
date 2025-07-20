안녕하세요 Claude Code!  
우리 **WaveFlow** 웹앱에 아래 4가지 UI/UX 기능을 추가/개편하고자 합니다. **기존 기능(파형 렌더링, 재생·토글·댓글 로직 등)은 그대로 유지**하면서 오직 UI와 인터랙션만 손봐 주세요.

---

## 1️⃣ 스페이스바 재생·일시정지 & 페이지 스크롤  
- **스페이스바 바인딩**  
  - `window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); wavesurfer.playPause(); } })`  
  - 플레이/일시정지 토글 상태에 따라 버튼 아이콘도 전환  
- **페이지 스크롤 활성화**  
  - `<main>` 컨테이너에 `overflow-y: auto; height: 100vh;` 적용  
  - 모바일·데스크탑 모두 스크롤 가능한지 확인  

---

## 2️⃣ 프로그레스바 따라다니는 “댓글 추가” 버튼 & 호버 시 입력창  
- **사이드바 댓글창 제거**  
  - 기존 `<CommentSidebar>` 컴포넌트를 제거하거나 조건부 렌더링 해제  
- **진행바(fprogress bar) 위 버튼**  
  - 타임바 컨테이너(`.progress-container`)에 절대 위치 버튼 `<button class="add-comment-btn">💬</button>` 추가  
  - 버튼이 `wavesurfer.getCurrentTime() / duration * width` 위치로 실시간 이동  
  - `useEffect`로 `wavesurfer.on('audioprocess', pos => setBtnX(...))`  
- **호버 시 댓글 입력 UI**  
  - 버튼에 `onMouseEnter` 시 `<CommentInputPopup timestamp={currentTime} />` 토글  
  - 팝업 내부에서 댓글 작성 → 제출 시 서버로 POST + marker 등록  

---

## 3️⃣ 댓글 위치에 사용자 아이콘 & SoundCloud 스타일 코멘트 팝업  
- **아이콘 마커**  
  - 댓글 생성 시 `wavesurfer.addMarker({ time, el: createAvatarEl(user.avatarUrl) })`  
  - `createAvatarEl`은 `<img src={avatarUrl} class="avatar-marker" />` 반환  
- **재생 시 코멘트 표시**  
  - `wavesurfer.on('audioprocess', time => { if (markerAt(time)) showFloatingComment(marker.comment) })`  
  - `showFloatingComment`는 파형 위에 작게 `div.comment-bubble`로 표시, 몇 초 뒤 페이드아웃  
- **스타일**  
  - `.avatar-marker { width:16px; height:16px; border-radius:50%; }`  
  - `.comment-bubble { position:absolute; bottom:100%; padding:8px; border-radius:4px; box-shadow:… }`  

---

## 4️⃣ 사이드바 버튼(Comment / StemList)과 파형 동기화 & 부드러운 스크롤  
- **버튼 토글 로직**  
  - `<button onClick={()=> setPanel('comments')}>댓글</button>`  
  - `<button onClick={()=> setPanel('stemList')}>Stem List</button>`  
  - `panel` 상태에 따라 `<CommentsPanel>` 또는 `<StemListPanel>` 슬라이드 토글  
- **파형과 동기화**  
  - 패널 오픈/클로즈 시 `wavesurfer.drawer.fireEvent('redraw')` 또는 `wavesurfer.drawBuffer()` 호출  
  - `transition: width .2s ease` 와 `overflow: hidden` 으로 레이아웃 변화 매끄럽게  
- **부드러운 스크롤/리사이즈**  
  - `requestAnimationFrame`으로 마커·버튼 위치 업데이트  
  - CSS `will-change: transform` 사용  

---

이대로 **React 컴포넌트**와 **Wavesurfer.js 플러그인**을 활용하여 각 기능을 구현해 주세요.  
기존 로직은 그대로 둔 채, UI/UX 개선만 진행해 주시면 됩니다.  위 코드는 예시고, 현재 코드들의 흐름에 맞게 구현해주세요.