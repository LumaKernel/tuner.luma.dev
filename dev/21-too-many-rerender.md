開始後、めちゃくちゃ全体にリレンダリングが走っている。(おそらくメインパネルの再描画に引っぱられてる)
そのせいで、Selectの選択肢などもスクロールがずっと戻されてまともに使えない。
ultrathink

ヘッダ内の録音一覧とか、それらを開いたあとのパネルとかがまだリレンダされていそう。
もうすこし、コードレベルで原理的に防げないものなのかな？
ultrathink


useAudioCapture.ts:494 The result of getSnapshot should be cached to avoid an infinite loop
usePitchData	@	useAudioCapture.ts:494
TunerDisplayContainer2	@	App.tsx:106
react-dom_client.js?v=0652998c:3526 Uncaught Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.
ultrathink


メトロノームのリレンダも音声ツール全体をリレンダしてしまっててスクロールなどに影響を与えているね。
ultrathink


メトロノームのBPMはテキストインプット的にも入力できて、そちらでは小数点以下まで指定できるようにしてほしい。数値のところがボタンになって、モーダルが専用で開いたほうがいいかも。
ultrathink


マイクの切り替えで最初の開始前の画面が一瞬見えるようになってしまった。
ultrathink


音量メータのMとL/Rの表示がピッチ検出できたときに切り替わったりする謎挙動をするようになった。マイクごと固有ではないのかな？
ultrathink


bpmはモーダル指定なら上限はもっと高くても良さそう。音楽ゲームの曲はもっと早いのがあるし。
ultrathink


