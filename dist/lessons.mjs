export const seed = `CREATE TABLE users(id INTEGER PRIMARY KEY, username TEXT, role TEXT, tenant TEXT, hidden INTEGER); INSERT INTO users VALUES(1,'alice','user','blue',0),(2,'bob','user','blue',0),(3,'admin','admin','red',1),(4,'carol','user','red',0); CREATE TABLE secrets(id INTEGER, label TEXT, value TEXT); INSERT INTO secrets VALUES(1,'launch_code','LAB-ORBIT-42'); CREATE TABLE cms_posts(id INTEGER,title TEXT,status TEXT); INSERT INTO cms_posts VALUES(1,'hello','publish'),(2,'DRAFT-LAB-2026','draft'); CREATE TABLE profiles(id INTEGER, nickname TEXT); CREATE TABLE legacy_customers(id INTEGER, name TEXT, email TEXT); INSERT INTO legacy_customers VALUES(1,'Demo Customer','demo@example.test'); CREATE TABLE payment_demo(id INTEGER, token TEXT); INSERT INTO payment_demo VALUES(1,'DEMO-CARD-TOKEN');`;
const L=(title,kind,goal,answer,hint,why,extra={})=>({title,kind,goal,answer,hint,why,...extra});
export const lessons=[
L('大文字だけの門番','search','非公開ユーザー admin を結果に出す',"' or 1=1 --",'OR が禁止されている。でも、小文字は？','大文字 OR だけの検出は、SQLの大文字・小文字を区別しない仕様と食い違う。',{block:'upper'}),
L('引用符の境界','search','admin を結果に出す',"' OR username='admin' --",'文字列を閉じ、条件を追加して残りをコメントにする。','入力を文字列結合すると、データがSQL構文になる。'),
L('数値なら安全？','numeric','admin を結果に出す','0 OR 1=1','数値の入力欄でも値をそのままSQLに差し込んでいる。','数値欄にも式を挿入できる。整数への厳密な変換とバインドが必要。'),
L('AND と OR の優先順位','tenant','別テナントの carol を結果に出す',"' OR username='carol' --",'AND は OR より先に評価される。','末尾に追加したテナント条件がコメントで消え、OR条件で境界が破れる。認可条件はサーバーの信頼できる値から作る。'),
L('キーワード禁止を迂回','search','OR を使わず admin を結果に出す',"' UNION SELECT id,username,role FROM users --",'別のSELECTの結果を結合できる。','単語リストだけでは、同じ結果を作る別のSQL構造を防げない。',{block:'or'}),
L('LIKE とワイルドカード','like','admin を結果に出す',"' OR 1=1 --",'LIKE の文字列も引用符で囲まれている。','LIKEでも値はバインドする。% を入力して候補が広がることと、SQL構造を変えることは別問題。'),
L('UNION の列数','union','秘密 LAB-ORBIT-42 を結果に出す',"' UNION SELECT 0,label,value FROM secrets --",'元のSELECTは3列。追加するSELECTも3列必要。','UNIONの列数を合わせると別テーブルの値が検索結果に流れる。'),
L('スキーマを調べる','schema','secrets テーブルの定義を結果に出す',"' UNION SELECT 0,name,sql FROM sqlite_master WHERE name='secrets' --",'SQLite のメタデータは sqlite_master にある。','テーブル定義へのアクセスも情報漏洩になる。ここではSQLite固有の仕組みを学ぶ。'),
L('結果が見えない検索','blind','秘密の先頭が L か、真偽だけで確認する',"' OR (SELECT substr(value,1,1) FROM secrets)='L' --",'画面に行は出ない。結果が「あり」か「なし」だけ変わる。','データそのものが表示されなくても、真偽の違いが推論の手がかりになる。'),
L('文字を1つずつ推論','blind','秘密の6文字目が R か、真偽だけで確認する',"' OR (SELECT substr(value,6,1) FROM secrets)='R' --",'substr の位置は1始まり。','真偽オラクルを繰り返すと文字を推論できる。問題文の秘密も含めすべて教材用データ。',{position:6}),
L('保存した値を信用する','second','保存後の再検索で admin を結果に出す',"' OR 1=1 --",'保存は安全でも、読み出した後に文字列連結していない？','保存時はバインドしていても、再利用時の連結で二次SQLインジェクションになる。'),
L('ORDER BY の落とし穴','order','並べ替え式に秘密テーブルへの参照を差し込む',"(SELECT value FROM secrets)",'列名の代わりに式を挿入できる。','パラメータは列名の代わりにならない。並べ替えは許可リストから列を選ぶ。表示順が変わらなくても式の挿入自体を検出する教材。'),
L('応用① 複合フィルター','search','OR と UNION を使わず admin を結果に出す',"' --",'非公開を除外する条件は入力値の後ろにある。','後続の hidden 条件をコメントにすると、空文字で一致するユーザーはいないので失敗。空文字でなく admin を指定する必要がある。',{block:'both',answer:"admin' --",why:'後続の hidden 条件をコメントにすると非公開ユーザーを直接指定できる。単語ブロックでは条件削除を防げない。'}),
L('応用② TalkTalk の教訓','legacy','旧検索ページから教材の顧客メールを表示する',"' UNION SELECT id,name,email FROM legacy_customers --",'検索先と同じ3列に、旧顧客テーブルを合わせる。','使われなくなった画面も公開されていれば入口になる。',{incident:0}),
L('応用③ Sony Pictures の教訓','union','検索画面から秘密を表示する',"' UNION SELECT 0,label,value FROM secrets --",'認証画面だけでなく、検索画面にも境界がある。','公開WebアプリのSQLiが機密情報への入口になり得る。',{incident:1}),
L('応用④ Heartland の教訓','payment','教材の決済トークンを結果に出す',"' UNION SELECT id,'payment',token FROM payment_demo --",'検索用のDB接続が別の教材テーブルも読める。','アプリの脆弱性に加え、接続先と権限の範囲が被害を左右する。',{incident:2}),
L('応用⑤ バインドしても認可は別','auth','通常入力 carol で、別テナントの行が見えることを確認する','carol','SQL構文は変えられない。でもテナント条件がない。','パラメータ化はSQLiを防ぐが、利用者ごとの認可を自動で追加しない。これはSQLiではなく認可不備。'),
L('防御確認 安全な境界','safe','通常検索 alice と攻撃入力を両方試す',"' OR 1=1 --",'値はパラメータとして扱われ、非公開条件も残る。','入力は構文に変わらず、攻撃入力は文字列として検索される。通常検索と攻撃入力を比較して修正を確認しよう。'),
L('応用⑥ Reactの入力制限だけ','front-api','フォームの制限を避け、疑似API経由で admin を表示する',"' OR 1=1 --",'送信方法を「疑似API直送」に変える。Reactの正規表現はサーバーの防御ではない。','Reactが入力を制限しても、FastAPIがstrを受けてSQLへ連結すれば境界は破れる。',{group:'modern',stack:'React → FastAPI → sqlite3',requiresAPI:true,answerContext:{channel:'api'},codeVuln:`// React: /^[a-z0-9_]+$/i で入力を制限\n# FastAPI（教材）: username: str\ncursor.execute(f"SELECT ... WHERE username='{username}' AND hidden=0")`,codeFixed:`# API側で値をバインド\ncursor.execute("SELECT ... WHERE username=? AND hidden=0", (username,))`}),
L('応用⑦ number欄とPythonのstr','api-id','数値フォームの制限を避けて admin を表示する','0 OR 1=1','input type=number はAPIの入力型を保証しない。','Python側の引数がstrならSQL式が届く。修正後は整数形式をサーバーで検査し、バインドする。',{group:'modern',normal:'1',requiresAPI:true,answerContext:{channel:'api'},stack:'React number input → FastAPI str',codeVuln:`// React: <input type="number" />\n# FastAPI（教材）\ndef search(id: str):\n    cursor.execute(f"SELECT ... WHERE id={id}")`,codeFixed:`# FastAPIでは型をintにし、用途に応じStrictInt等で検証\n# 教材では10進整数の文字列を厳密に検査\ncursor.execute("SELECT ... WHERE id=? AND hidden=0", (validated_id,))`}),
L('応用⑧ SQLAlchemyのtextとf-string','orm-raw','ORMから呼ばれる生SQLで admin を表示する',"' OR 1=1 --",'text() に渡す前にf-stringが展開されている。','SQLAlchemyのtext()は、既に連結されたSQLを自動で安全に戻さない。名前付きパラメータを使う。',{group:'modern',stack:'React → Python / SQLAlchemy',codeVuln:`session.execute(text(f"SELECT ... WHERE username='{q}' AND hidden=0"))`,codeFixed:`session.execute(text("SELECT ... WHERE username=:q AND hidden=0"), {"q": q})`}),
L('応用⑨ 並べ替え式だけ生SQL','orm-order','admin を一覧の先頭に並べ替える',"CASE WHEN username='admin' THEN 0 ELSE 1 END",'検索値はバインド済みでも、order_by(text(sort)) は別の境界。','一覧閲覧が許可されている教材。列名として渡した値がSQL式になってしまう。修正後は許可した列だけを選ぶ。',{group:'modern',normal:'id',target:'admin-first',stack:'React table → SQLAlchemy order_by',codeVuln:`# 全ユーザー一覧を見る権限はある設定\nstmt = select(User).order_by(text(sort))`,codeFixed:`columns = {"id": User.id, "username": User.username, "role": User.role}\nstmt = select(User).order_by(columns.get(sort, User.id))`}),
L('応用⑩ 検査の後にデコード','decode','変換前の禁止語検査を通り、admin を表示する','%27%20OR%201%3D1%20--','禁止語検査の後でurllib.parse.unquoteを呼んでいる。','APIが受け取った値を独自に再デコードする教材。HTTP標準のデコード後にもう一度変換すると、検査時と実行時で値が違う。',{group:'modern',stack:'React → Python custom decoder',requiresAPI:true,answerContext:{channel:'api'},codeVuln:`# APIが既に受け取った文字列に対する独自処理\nif "'" in q or "or" in q.lower(): reject()\nq = urllib.parse.unquote(q)\ncursor.execute(f"SELECT ... WHERE username='{q}' AND hidden=0")`,codeFixed:`q = urllib.parse.unquote(q)\ncursor.execute("SELECT ... WHERE username=? AND hidden=0", (q,))`}),
L('応用⑪ 検索は安全、CSVは？','export-route','CSV出力ルートの修正漏れで admin を表示する',"' OR 1=1 --",'疑似ルートを「CSV出力」に切り替える。','検索APIだけ修正しても、同じ入力を扱うエクスポートAPIに連結処理が残る場合がある。',{group:'modern',stack:'React → FastAPI search / export',answerContext:{route:'export'},codeVuln:`# /search はパラメータ化済み\n# /export だけ古い実装が残る\ncursor.execute(f"SELECT ... WHERE username='{q}' AND hidden=0")`,codeFixed:`# 両ルートが同じ安全な検索関数を利用\nsearch_users(q)  # qはバインド`}),
L('応用⑫ ORM保存後の帳票','modern-second','安全に保存した検索条件を再利用して admin を表示する',"' OR 1=1 --",'SQLAlchemyで保存した条件も、帳票処理で再びバインドが必要。','保存が安全であることと、保存値が安全なSQL断片であることは異なる。保存・再読込を実際に教材DBで行う。',{group:'modern',stack:'React → ORM save → Python report',codeVuln:`# 保存: ORMの値として保存\n# 帳票: 保存値を文字列連結\ncursor.execute(f"SELECT ... WHERE username='{saved_filter}' AND hidden=0")`,codeFixed:`cursor.execute("SELECT ... WHERE username=? AND hidden=0", (saved_filter,))`}),
L('応用⑬ JSONのtenantを信用','json-tenant','JSONのtenantをredに変え、carol を表示する','{"username":"carol","tenant":"red"}','Reactで非表示のtenantも、JSONとして書き換えられる。これはSQLiではなく認可の問題。','すべての値がバインドされていても、要求JSONのtenantを信用すると他テナントのデータが見える。修正後はログイン利用者のblueを使う。',{group:'modern',normal:'{"username":"alice","tenant":"blue"}',target:'carol',stack:'React JSON → FastAPI / Pydantic',codeVuln:`# Pydanticでどちらもstrとして検証\ncursor.execute("SELECT ... WHERE username=? AND tenant=?", (body.username, body.tenant))`,codeFixed:`# tenantは認証済みの利用者から取得\ncursor.execute("SELECT ... WHERE username=? AND tenant=?", (body.username, current_user.tenant))`}),
L('応用⑭ 公開AJAXのプラグイン','wp-public','架空プラグインの公開検索から下書きを表示する',"' OR 1=1 --",'管理画面を使わなくても、公開用AJAXハンドラーにはリクエストが届く。','wp_ajax_noprivの公開検索を持つ架空プラグイン。公開を許す機能でも、下書きの認可とSQL値の保護は必要。',{group:'wordpress',normal:'hello',target:'DRAFT-LAB-2026',stack:'WordPress → Demo Catalog plugin',codeVuln:`add_action('wp_ajax_nopriv_demo_search', 'demo_search');\n// 教材: $qを直接連結して検索\n$wpdb->get_results("SELECT ... WHERE title='$q' AND status='publish'");`,codeFixed:`$wpdb->get_results($wpdb->prepare("SELECT ... WHERE title=%s AND status='publish'", $q));`}),
L('応用⑮ nonceは閲覧権限？','wp-nonce','購読者の有効なnonceだけで下書きを表示する','DRAFT-LAB-2026','nonceは有効。でも、購読者に下書き閲覧権限はある？','nonceを持つ購読者として演習する。nonceは認証・認可の代わりではない。この問題はSQLiではなく権限チェック漏れ。',{group:'wordpress',normal:'hello',target:'DRAFT-LAB-2026',stack:'WordPress / subscriber + valid nonce',incident:3,codeVuln:`check_ajax_referer('demo_report');\n// current_user_canの確認がない\n$wpdb->get_results($wpdb->prepare("SELECT ... WHERE title=%s", $q));`,codeFixed:`check_ajax_referer('demo_report');\nif (!current_user_can('edit_posts')) { return HTTP_403; }\n// 下書きごとの閲覧権限も確認`}),
L('応用⑯ テキスト整形はSQL対策？','wp-sanitize','整形処理を通る入力で下書きを表示する',"' OR 1=1 --",'HTMLを除去しても、引用符がSQL用に処理されるとは限らない。','sanitize_text_fieldはSQLの安全性を保証しない。教材ではHTML除去など一部の整形だけを模擬し、SQL実行はSQLiteで行う。',{group:'wordpress',normal:'hello',target:'DRAFT-LAB-2026',stack:'WordPress / sanitize_text_field',incident:4,codeVuln:`$q = sanitize_text_field($_GET['q']);\n$wpdb->get_results("SELECT ... WHERE title='$q' AND status='publish'");`,codeFixed:`$q = sanitize_text_field($_GET['q']);\n$wpdb->get_results($wpdb->prepare("SELECT ... WHERE title=%s AND status='publish'", $q));`}),
L('応用⑰ prepareの外で連結','wp-prepare','一部だけprepareした検索から下書きを表示する',"' OR 1=1 --",'IDは%dだが、検索語はprepareを呼ぶ前に連結されている。','prepareを使っているかどうかだけでは判断できない。外部入力をすべて適切なプレースホルダーの値として渡す。',{group:'wordpress',normal:'hello',target:'DRAFT-LAB-2026',stack:'WordPress / $wpdb->prepare',codeVuln:`$sql = "SELECT ... WHERE id > %d AND title='$q' AND status='publish'";\n$wpdb->get_results($wpdb->prepare($sql, 0));`,codeFixed:`$wpdb->get_results($wpdb->prepare("SELECT ... WHERE id > %d AND title=%s AND status='publish'", 0, $q));`}),
L('応用⑱ 本体更新、Blocks据え置き','wp-old-rest','旧版相当の疑似REST検索から下書きを表示し、修正版と比較する',"' OR 1=1 --",'バージョン切替は本体ではなく、プラグイン側の修正状態を表す。','WordPress本体の更新はプラグインの更新を意味しない。教材は架空REST検索で修正前後を比較する。実際のWooCommerce Blocksのtaxonomy処理やMySQLの攻撃文字列は再現しない。',{group:'wordpress',normal:'hello',target:'DRAFT-LAB-2026',stack:'WordPress core updated / Blocks historical case',incident:5,versions:['Blocks 5.5.0相当（教材・修正前）','Blocks 5.5.1相当（教材・当時の修正後）'],codeVuln:`// 架空REST: /demo-catalog/v1/search\n// 本体が新しくてもプラグインの連結処理が残る\n$sql = "SELECT ... WHERE title='$q' AND status='publish'";`,codeFixed:`// この脆弱性が修正された版を導入\n// 教材では値をバインドする安全な処理に切替`}),
L('応用⑲ アクセスログから管理帳票へ','wp-stored','保存した流入キーワードが管理帳票のSQLになることを確認する',"' OR 1=1 --",'公開側で保存したキーワードを管理者の帳票が読み出す。','公開ログの値を管理側のLIKE検索へ連結すると二次SQLiになる。参考事例のWP Visitor StatisticsとはDB構造も入力経路も異なる教材。',{group:'wordpress',normal:'hello',target:'DRAFT-LAB-2026',stack:'Public tracking → WordPress admin report',incident:6,versions:['WP Visitor Statistics 8.7相当（教材・修正前）','8.7.1相当（教材・当時の修正後）'],codeVuln:`// ログへの保存はバインド\n// 管理帳票で保存値を連結\n$sql = "SELECT ... WHERE title LIKE '%$saved_keyword%' AND status='publish'";`,codeFixed:`$pattern = '%' . $wpdb->esc_like($saved_keyword) . '%';\n$sql = $wpdb->prepare("SELECT ... WHERE title LIKE %s AND status='publish'", $pattern);`}),
L('応用⑳ 古い本体とバックポート','wp-core','未修正相当で下書きを表示し、同じ5.8系の修正版と比較する',"' OR 1=1 --",'大きなバージョン番号を上げなくても、セキュリティ修正が提供された事例がある。','5.8.3でWP_QueryとWP_Meta_QueryのSQLiが修正された。古い系列にも修正が配布されたため、系列番号だけで脆弱性は決められない。この教材は実際のコア関数を再現せず、修正有無を単純化して比較する。',{group:'versions',normal:'hello',target:'DRAFT-LAB-2026',stack:'WordPress historical core patch',incident:7,versions:['WordPress 5.8.2相当（教材・未修正）','WordPress 5.8.3相当（教材・当時の修正済み）'],codeVuln:`// 教材用の架空検索処理。実コアの再現ではない\n$sql = "SELECT ... WHERE title='$q' AND status='publish'";`,codeFixed:`// 当該修正を含む本体へ更新\n// 教材では安全なバインド処理に切替`}),
L('応用㉑ Django本体にも修正がある','django-alias','教材の識別子挿入で秘密を表示し、修正後の許可リストと比較する','id,username,role FROM users UNION SELECT 0,label,value FROM secrets --','値のバインドと、列の別名の検証は別。入力するのは教材用の別名断片。','列の別名は、値のバインドとは別に検証する。許可リストで使える識別子を固定し、本体のセキュリティ修正も導入する。',{group:'versions',normal:'id',target:'LAB-ORBIT-42',stack:'Django + MySQL/MariaDB advisory / SQLite model',incident:8,versions:['Django 5.2.6相当（教材・修正前）','Django 5.2.7相当（教材・当時の修正後）'],codeVuln:`# 参考事例の実コードではない、識別子の教材モデル\nsql = f"SELECT id AS {alias}, username, role FROM users WHERE hidden=0"`,codeFixed:`# 本体修正を導入し、外部入力を識別子にしない\nallowed = {"id": "id", "user_id": "user_id"}\nalias = allowed.get(alias)  # 未許可は拒否`})
];
export const incidents=[
{title:'TalkTalk · 2015',text:'ICOは旧WebページのSQLインジェクション、古いDBソフトウェア、監視不足を指摘。156,959人分の個人情報にアクセスされた。',url:'https://ico.org.uk/about-the-ico/media-centre/talktalk-cyber-attack-how-the-ico-investigation-unfolded/',source:'英国 ICO'},
{title:'Sony Pictures · 2011',text:'米司法省は、WebサイトへのSQLインジェクションによって顧客の機密情報が取得されたと説明している。',url:'https://www.justice.gov/usao-cdca/pr/member-lulzsec-hacking-group-sentenced-over-year-federal-prison-2011-intrusion-sony',source:'米司法省'},
{title:'Heartland など · 2009年起訴',text:'米司法省の起訴発表は、Heartland、7-Eleven、Hannafordを被害企業に挙げ、SQLインジェクションを用いた侵入を説明している。',url:'https://www.justice.gov/archives/opa/pr/alleged-international-hacker-indicted-massive-attack-us-retail-and-banking-networks',source:'米司法省'},
{title:'WordPress公式: nonceの役割',text:'公式文書はnonceを認証・認可・アクセス制御に利用しないよう説明している。権限はcurrent_user_canなどで別途確認する。',url:'https://developer.wordpress.org/apis/security/nonces/',source:'WordPress Developer Handbook'},
{title:'WordPress公式: テキスト整形とSQL',text:'sanitize_text_fieldの公式リファレンスには、SQLインジェクション対策として利用するものではない旨の注意がある。',url:'https://developer.wordpress.org/reference/functions/sanitize_text_field/',source:'WordPress Developer Reference'},
{title:'WooCommerce Blocks · CVE-2021-32789',text:'公式アドバイザリはStore APIのSQLiを公表。5.5.1だけでなく5.4.1など複数の古い系列にも修正版を列挙している。これは歴史上の修正情報で、現在の推奨版を意味しない。',url:'https://github.com/woocommerce/woocommerce-blocks/security/advisories/GHSA-6hq4-w6wv-8wrp',source:'WooCommerce公式 Security Advisory'},
{title:'WP Visitor Statistics · 8.7.1の変更履歴',text:'公開トラッキングで保存された流入キーワードが管理帳票のLIKE検索へ連結される二次SQLiを、8.7.1で修正したと開発者が記載している。',url:'https://wordpress.org/plugins/wp-stats-manager/',source:'WordPress.org プラグイン変更履歴'},
{title:'WordPress · 5.8.3 Security Release / 2022',text:'WP_QueryとWP_Meta_QueryのSQLi修正を公式に発表。WP_Meta_Queryの対象は4.1〜5.8。古い系列にも修正が配布された。5.8.3は当時の修正版であり、現在の推奨版ではない。',url:'https://wordpress.org/news/2022/01/wordpress-5-8-3-security-release/',source:'WordPress公式リリース'},
{title:'Django · CVE-2025-59681 / 2025',text:'MySQL/MariaDBにおけるannotate・alias・aggregate・extraへの辞書展開と列別名が対象。5.2.7、5.1.13、4.2.25で修正。SQLiteでこのCVE自体は再現していない。',url:'https://www.djangoproject.com/weblog/2025/oct/01/security-releases/',source:'Django公式 Security Release'}
];
export function plan(level,input,defense=false,context={}){
 if(lessons[level].group) return modernPlan(level,input,defense,context);
 const l=lessons[level], safe=defense||['safe','auth'].includes(l.kind); let sql,params=[];
 const fields='id,username,role';
 if(!safe&&((l.block==='upper'&&input.includes('OR'))||(l.block==='or'&&/\bor\b/i.test(input))||(l.block==='both'&&/\b(or|union)\b/i.test(input))))return {blocked:true,reason:'簡易フィルターが入力を拒否しました。'};
 if(l.kind==='numeric'){sql=`SELECT ${fields} FROM users WHERE id = ${safe?'?':input}${safe?' AND hidden=0':''}`;params=safe?[Number.isInteger(Number(input))?Number(input):-1]:[];}
 else if(l.kind==='order'){const col=['id','username','role'].includes(input)?input:'id';sql=`SELECT ${fields} FROM users ORDER BY ${safe?col:input}`;}
 else if(l.kind==='tenant'||l.kind==='auth'){sql=`SELECT ${fields} FROM users WHERE username = ${safe?'?':"'"+input+"'"}${l.kind==='auth'&&!defense?'':" AND tenant = 'blue'"}`;params=safe?[input]:[];}
 else if(l.kind==='second'){sql=`SELECT ${fields} FROM users WHERE username = ${safe?'?':"'"+input+"'"} AND hidden=0`;params=safe?[input]:[];}
 else if(l.kind==='like'){sql=`SELECT ${fields} FROM users WHERE username LIKE ${safe?'?':"'%"+input+"%'"} AND hidden=0`;params=safe?['%'+input+'%']:[];}
 else {sql=`SELECT ${fields} FROM users WHERE username = ${safe?'?':"'"+input+"'"} AND hidden=0`;params=safe?[input]:[];}
 return {sql,params,safe,stage:l.kind==='second'?'INSERT INTO profiles(id,nickname) VALUES(1,?) → 保存値を再読込':''};
}
export function achieved(level,input,result){const l=lessons[level];const rows=result.flatMap(x=>x.values);const flat=rows.flat().map(String);if(l.target==='admin-first')return rows[0]?.[1]==='admin';if(l.target)return flat.includes(l.target);if(l.kind==='safe')return false;if(l.kind==='blind')return rows.length>0&&/substr/i.test(input)&&input.includes(l.position===6?'6':'1');if(l.kind==='schema')return flat.some(x=>/CREATE TABLE secrets/i.test(x));if(l.kind==='order')return /select\s+value\s+from\s+secrets/i.test(input);if(l.kind==='legacy')return flat.includes('demo@example.test');if(l.kind==='payment')return flat.includes('DEMO-CARD-TOKEN');if(l.kind==='union')return flat.includes('LAB-ORBIT-42');if(l.kind==='tenant'||l.kind==='auth')return flat.includes('carol');return flat.includes('admin');}

function modernPlan(level,input,defense,context){
 const l=lessons[level];const version=context.version||'old',channel=context.channel||'screen',route=context.route||'search';
 const safe=defense||(l.versions&&version==='patched');
 const block=reason=>({blocked:true,reason,safe,stage:'リクエスト検査で停止。SQLは実行しません。'});
 const userFields='id,username,role',postFields='id,title,status';let sql,params=[],stage='疑似API → 教材SQLite';
 if(l.requiresAPI&&channel==='screen'&&!(l.kind==='api-id'?/^\d+$/:/^[a-z0-9_]+$/i).test(input))return block('React相当の入力チェックが拒否しました。疑似API直送と比較してください。');
 if(l.kind==='api-id'){
  if(safe&&!/^\d+$/.test(input))return block('HTTP 422相当: API側の整数検証が拒否しました。');
  sql=`SELECT ${userFields} FROM users WHERE id=${safe?'?':input}${safe?' AND hidden=0':''}`;params=safe?[Number(input)]:[];
 }else if(l.kind==='orm-order'){
  const order=safe?(['id','username','role'].includes(input)?input:'id'):input;
  sql=`SELECT ${userFields} FROM users ORDER BY ${order},id`;
 }else if(l.kind==='json-tenant'){
  let body;try{body=JSON.parse(input);}catch{return block('HTTP 422相当: JSONの構文を確認してください。');}
  if(typeof body.username!=='string'||typeof body.tenant!=='string')return block('HTTP 422相当: username と tenant は文字列です。');
  sql=`SELECT ${userFields} FROM users WHERE username=? AND tenant=?`;params=[body.username,safe?'blue':body.tenant];
  stage='JSON型検査 → '+(safe?'認証済み利用者のtenant=blue':'要求JSONのtenantを信用')+' → バインドSQL';
 }else if(l.kind==='django-alias'){
  if(safe&&!['id','user_id'].includes(input))return block('修正版相当: 許可されていない列別名を拒否しました。');
  sql=`SELECT id AS ${input},username,role FROM users WHERE hidden=0`;
  stage='列別名をSQLに組み込む前に検証。';
 }else if(l.kind.startsWith('wp-')){
  if(l.kind==='wp-nonce'){
   if(safe)return block('HTTP 403相当: 購読者には下書き閲覧権限がありません。');
   sql=`SELECT ${postFields} FROM cms_posts WHERE title=?`;params=[input];stage='購読者 / nonce有効 → 権限検査が欠落 → バインドSQL';
  }else{
   if(l.kind==='wp-sanitize')input=input.replace(/<[^>]*>/g,'').replace(/[\r\n\t]+/g,' ').trim();
   const like=l.kind==='wp-stored',prepared=l.kind==='wp-prepare';
   sql=`SELECT ${postFields} FROM cms_posts WHERE ${prepared?'id > ? AND ':''}title ${like?'LIKE':'='} ${safe?'?':"'"+(like?'%':'')+input+(like?'%':'')+"'"} AND status='publish'`;
   params=prepared?[0]:[];if(safe)params.push(like?'%'+input.split(String.fromCharCode(92)).join(String.fromCharCode(92,92)).replace(/[%_]/g,m=>String.fromCharCode(92)+m)+'%':input);
   if(safe&&like)sql=sql.replace(" AND status", " ESCAPE char(92) AND status");
   stage=(l.kind==='wp-stored'?'ログ保存をバインド → 保存値を読込 → 管理帳票':'疑似WordPressハンドラー')+' → '+(safe?'修正後相当':'未修正の教材コード');
  }
 }else{
  if(l.kind==='decode'){
   if(!safe&&(/'/.test(input)||/\bor\b/i.test(input)))return block('変換前の禁止語検査が拒否しました。');
   try{input=decodeURIComponent(input);}catch{return block('デコードできない入力です。');}
   stage='独自検査 → 独自URLデコード → SQL';
  }
  const bound=safe||(l.kind==='export-route'&&route!=='export');
  sql=`SELECT ${userFields} FROM users WHERE username=${bound?'?':"'"+input+"'"} AND hidden=0`;params=bound?[input]:[];
  stage=l.kind==='export-route'?`疑似 /${route} → ${bound?'バインド済み':'古い連結処理'}`:l.kind==='modern-second'?'ORM相当で保存 → 保存値を読込 → 帳票SQL':stage;
  return {sql,params,safe:bound,stage};
 }
 return {sql,params,safe,stage};
}
