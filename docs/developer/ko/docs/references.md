## 마크업 문법

## 기본 스타일

## 기본 오브젝트

### 이미지 (Image)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object image: filename="image.jpg"

#### 속성

#### 액션

#### 이벤트

### 포토 (Photo)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object photo: filename="photo.jpg"

#### 속성

#### 액션

#### 이벤트

### 포토플러스 (Photo Plus)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object photoplus: filename="photo.jpg"

#### 속성

#### 액션

#### 이벤트

### 포토줌 (Photo Zoom)

- 지원 플랫폼: iOS
- 잼킷 버전: 1.0

#### 사용예

	=object photoplus: filename="photo.jpg"

#### 속성

#### 액션

#### 이벤트

### 포토스크롤 (Photo Scroll)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object photoscroll: filename="photo.jpg"

#### 속성

#### 액션

### 멀티포토 (Multi Photo)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object multiphoto: photo-1="photo.jpg;메인캡션;서브캡션", photo-2="photo.jpg;메인캡션;서브캡션", photo-3="photo.jpg;메인캡션;서브캡션"

#### 속성

#### 액션

#### 이벤트

### 포토롤 (Photo Roll)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object photoroll: photo-1="photo.jpg;메인캡션;서브캡션", photo-2="photo.jpg;메인캡션;서브캡션", photo-3="photo.jpg;메인캡션;서브캡션"

#### 속성

#### 액션

#### 이벤트

### 코믹 (Comic)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object comic: image="comic.jpg"

#### 속성

#### 액션

#### 이벤트



### 지도 (Map)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object map: latitude="37.566535", longitude="126.977969", zoom-level="17"

#### 속성

#### 액션

#### 이벤트

### 미니지도 (Mini Map)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object minimap: latitude="37.566535", longitude="126.977969", zoom-level="17"

#### 속성

#### 액션

#### 이벤트

### 라벨 (Label)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object label: text="라벨"
	=object label: image="label.jpg"

#### 속성

#### 액션

#### 이벤트

### 버튼 (Button)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object button: label="클릭"
	=object button: image="click.jpg", highlight-image="clicked.jpg"

#### 속성

#### 액션

#### 이벤트

### 텍스트필드 (Textfield)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object textfield: placeholder="여기에 입력하세요."

#### 속성

#### 액션

#### 이벤트

### 텍스트 입력창 (Text)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object text: text="여기에 입력하세요."

#### 속성

#### 액션

#### 이벤트

### 체크박스 (CheckBox)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object checkbox: image="normal.jpg", selected-image="selected.jpg"

#### 속성

#### 액션

#### 이벤트

### 초이스 (Choices)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object choices: choice-1="(1);보기 1", choice-2="(2);보기 2", choice-3="(3);보기 3", choice-image="selected.jpg"

#### 속성

#### 액션

#### 이벤트

### 입력 (Input)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object input: id="key", value="value"

#### 속성

#### 액션

#### 이벤트

### 비디오 (Video)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object video: filename="sample.mp4"
	=object video: url="http://www.video.org/sample.mp4"

#### 속성

#### 액션

#### 이벤트

### 웹비디오 (Web Video)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object webvideo: url="https://embed-ssl.ted.com/talks/shivani_siroya_a_smart_loan_for_people_with_no_credit_history_yet.html"

#### 속성

#### 액션

#### 이벤트

### 유튜브 (YouTube)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object youtube: video-id="9bZkp7q19f0"

#### 속성

#### 액션

#### 이벤트

### 비메오 (Vimeo)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object vimeo: video-id="176434092"

#### 속성

#### 액션

#### 이벤트

### 웹 (Web)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object web: url="http://m.naver.com"

#### 속성

#### 액션

#### 이벤트

### PDF 페이지 (PDF Page)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object pdf: url="http://www.pdf.org/sample.pdf", page=1

#### 속성

#### 액션

#### 이벤트

### 차트 (Chart)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object chart: filename="chart.json"

#### 속성

#### 액션

#### 이벤트


### 블랭크 (Blank)

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object blank: color="#ff0"

#### 속성

#### 액션

#### 이벤트

## 컨테이너 오브젝트

### Panes 오브젝트

Panes 오브젝트는 pane이라 부르는 페이지를 여러 개 포함할 수 있는 콘테이너 오브젝트이다. 각 pane의 크기는 오브젝트의 크기와 동일하며, pane의 내용은 sbml로 표현한다. pane 간의 이동은 가로 스크롤이나 네비게이션 바를 이용한다. 네비게이션 바는 오브젝트 상단이나 하단, 혹은 좌우에 배치할 수 있으며, 네비게이션 바에는 각 pane마다 대응되는 셀(cell)이 있어서 해당 셀을 선택하면 이와 대응되는 pane이 화면에 나타난다. 또한 셀을 통해 현재 선택되어 있는 pane을 확인할 수 있다. 네비게이션의 셀의 내용은 sbml로 표현한다. Panes 오브젝트는 헤더(header)를 포함할 수 있으며 헤더의 내용은 sbml로 표현한다.

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

#### 사용예

	=object panes: name="main", has-navibar="yes", navibar-cell-size="0.2pw, 2em"

#### 선택된 셀의 표현 방법
네비게이션 바에서 현재 선택된 셀을 위한 sbml을 로딩할 때 선택된 상태를 나타내는 환경변수를 sbss에서 사용할 수 있다. 환경변수 이름은 $STATE이고 선택된 셀에는 $STATE의 값으로 "selected"가 지정된다. 따라서 아래와 같은 방법으로 sbss를 작성하면 선택된 셀에 특정 색상 값이나 이미지 등을 지정할 수 있다.

	if $STATE == "selected"
  		/cell: text-color=#f00
	else
  		/cell: text-color=#000
	end

#### 디바이스별 고려사항
메모리가 작은 디바이스 등에서 적은 리소스로 동작을 시키려면 싱글 모드를 사용해야 한다.

#### 속성

#### 액션

#### 이벤트

### Banner 오브젝트

Banner 오브젝트란 한 개 이상의 배너 페이지를 자동으로 롤링하여 보여주는 콘테이너 오브젝트이다. Banner 오브젝트는 주로 화면 상단에 배치되어 광고용으로 사용된다. Banner 오브젝트에 포함된 배너 페이지를 셀(cell)이라고 하며, 각 셀의 내용은 sbml을 이용하여 표현한다. 여러 개의 셀이 자동으로 전환될 때의 시간 간격이나 효과 등을 지정할 수 있다. 

#### 사용예

	=object banner: name="main", rotate-interval=1.0

#### 외부 데이터를 사용하는 방법

Banner 오브젝트는 외부 데이터를 사용하여 셀의 내용을 채워넣는 기능을 지원한다. 외부 데이터는 웹(HTTP/S)을 통해 액세스 가능해야 하며, 요청에 대한 응답으로 json으로 표현된 데이터를 전송해야 한다. 웹 요청은 GET 메소드를 사용하며, 해당 배너의 모든 데이터를 한번에 포함하여 응답해야 한다. Banner 오브젝트에서 외부 데이터를 사용하려면 data-downloadable을 "yes"로 지정하고, data-url 속성에 외부 데이터의 URL을 지정하면 된다. 

	=object banner: name="ads", data-downloadable="yes", data-url="http://www.munhak.com/ads"

### Showcase 오브젝트

Showcase 오브젝트란 말그대로 진열장이다. Showcase 오브젝트를 이용하여 여러 개의 상품이나 컨텐츠들을 늘어놓고 진열할 수 있다. Showcase 오브젝트는 격자형 모양으로 상품들을 진열하는 데, 격자의 한 칸을 가리켜 셀(cell)이라고 하며, 각 셀은 sbml을 이용하여 표현한다. Showcase 오브젝트는 고정 크기이거나 가로/세로 스크롤이 가능하도록 지정할 수 있다. Showcase 오브젝트 내에 포함된 셀들은 정렬이 가능하며, 정렬의 기준은 sortkey와 sortorder 속성을 이용하여 변경할 수 있다. Showcase 오브젝트는 헤더(header)와 푸터(footer)를 포함할 수 있는데, 이들의 내용은 각각 sbml로 표현한다. 

#### 외부 데이터를 사용하는 방법

Showcase 오브젝트는 외부 데이터를 사용하여 셀의 내용을 채워넣는 기능을 지원한다. 외부 데이터는 웹(HTTP/S)을 통해 액세스 가능해야 하며, 요청에 대한 응답으로 json으로 표현된 데이터를 전송해야 한다. 웹 요청은 POST 방식을 사용하며, 요청하는 데이터의 범위(시작위치, 갯수)를 파라미터로 전달할 수 있다. 요청받은 범위가 실제 데이터의 범위를 벗어나면, 빈 json 데이터와 함께 성공 응답(200)을 해야 한다. 데이터 범위를 파라미터로 전달하지 않으면, 모든 데이터를 한번에 포함하여 응답한다. Showcase 오브젝트에서 외부 데이터를 사용하려면 data-downloadable을 "yes"로 지정하고, data-url 속성에 외부 데이터의 URL을 지정하면 된다. Showcase 오브젝트에 Load more 기능이 활성화되어 있다면(loads-more="yes"), 데이터의 범위를 지정하여 외부 

	=object showcase: name="magazine", data-downloadable="yes", data-url="http://www.munhak.com/magazine", loads-more="yes"

### Cards 오브젝트


## 쇼케이스 오브젝트


## 컨트롤러

