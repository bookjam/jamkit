## 페인(Panes) 오브젝트

페인(Panes) 오브젝트는 pane이라 부르는 페이지를 여러 개 포함할 수 있는 콘테이너 오브젝트이다. 각 pane의 크기는 오브젝트의 크기와 동일하며, pane의 내용은 sbml로 표현한다. pane 간의 이동은 가로 스크롤이나 네비게이션 바를 이용한다. 네비게이션 바는 오브젝트 상단이나 하단, 혹은 좌우에 배치할 수 있으며, 네비게이션 바에는 각 pane마다 대응되는 셀(cell)이 있어서 해당 셀을 선택하면 이와 대응되는 pane이 화면에 나타난다. 네비게이션의 셀의 내용은 sbml로 표현한다. 페인 오브젝트는 헤더(header)를 포함할 수 있으며 헤더의 내용은 sbml로 표현한다.

- 지원 플랫폼: iOS, 안드로이드
- 잼킷 버전: 1.0

### 사용예

	=object panes: name="main", has-navibar=yes, navibar-cell-size="0.2pw, 2em"

### 속성

속성 | 타입(허용값) | 기본값 | 단위 | 설명
--- | --- | --- | --- | ---
alternate-name | String | None | | sbml 파일을 선택할 때 name 대신 사용할 가상의 이름.
has-header | Boolean | no | | 헤더 영역을 표시하려면 yes를 지정함.
header-display-unit | String | None | | 헤더 영역에 사용할 데이터 항목.
has-navibar | Boolean | no | | 네비게이션 바를 표시하려면 yes를 지정함.
navibar-cell-size | Size | "0, 0" | dp, em, layout의 상대값 | 네비게이션 바의 셀 크기.
navibar-cell-spacing | Float | 0 | dp, em, layout의 상대값 | 네비게이션 바의 셀 간격.
navibar-margin | Side | "0 0 0 0" | dp, em, layout의 상대값  | 네비게이션 바의 상하좌우 여백. 축약형 사용 가능. 예) "1em", "1em 20dp", "1em 1.5em 0 1.2em"
navibar-position | top/bottom/left/right | top | | 네비게이션 바의 위치.
navibar-center-align | Boolean | no | | 네비게이션 바 내의 셀들을 가운데 정렬을 하려면 yes를 지정함. 이 때, 선택되어 있는 셀을 기준으로 가운데 정렬을 한다.
single-mode | Boolean | no | | Pane 영역이 싱글 모드로 동작하려면 yes를 지정함. 싱글 모드로 동작하면 스크롤을 통한 pane 간의 이동이 불가하며, 네비게이션 바를 통해 이동을 해야 한다.
weekday-mode | Boolean | no | | pane 데이터가 요일별 구성으로 동작하려면 yes를 지정함. 요일별 구성을 적용하면 해당 요일에 따라 첫 시작 위치가 결정된다.
monday-is-first | Boolean | no | | 요일별 pane 데이터가 월요일부터 시작하려면 yes를 지정함. "no"를 지정하면 일요일부터 시작한다.
weekday-offset | Integer | 0 | | 요일의 pane 데이터가 시작되는 네비게이션 상의 위치를 지정함. 1로 지정하면 두번째 pane 부터 차례대로 요일을 부여한다.

### 액션

### 이벤트

### 선택된 셀의 표현 방법
네비게이션 바에서 현재 선택된 셀을 위한 sbml을 로딩할 때 선택된 상태를 나타내는 환경변수를 sbss에서 사용할 수 있다. 환경변수 이름은 $STATE이고 선택된 셀에는 $STATE의 값으로 "selected"가 지정된다. 따라서 아래와 같은 방법으로 sbss를 작성하면 선택된 셀에 특정 색상 값이나 이미지 등을 지정할 수 있다.

	if $STATE == "selected"
  		/cell: text-color=#f00
	else
  		/cell: text-color=#000
	end

### 디바이스별 고려사항
메모리가 작은 디바이스 등에서 적은 리소스로 동작을 시키려면 싱글 모드를 사용해야 한다.

## 배너(Banner) 오브젝트

배너(Banner) 오브젝트란 한 개 이상의 배너 페이지를 자동으로 롤링하여 보여주는 콘테이너 오브젝트이다. 배너 오브젝트는 주로 화면 상단에 배치되어 광고용으로 사용된다. 배너 오브젝트에 포함된 배너 페이지를 셀(cell)이라고 하며, 각 셀의 내용은 sbml을 이용하여 표현한다. 여러 개의 셀이 자동으로 전환될 때의 시간 간격이나 효과 등을 지정할 수 있다. 

### 사용예

	=object banner: name="main", rotate-interval=1.0

### 외부 데이터를 사용하는 방법

Banner 오브젝트는 외부 데이터를 사용하여 셀의 내용을 채워넣는 기능을 지원한다. 외부 데이터는 웹(HTTP/S)을 통해 액세스 가능해야 하며, 요청에 대한 응답으로 json으로 표현된 데이터를 전송해야 한다. 웹 요청은 GET 메소드를 사용하며, 해당 배너의 모든 데이터를 한번에 포함하여 응답해야 한다. Banner 오브젝트에서 외부 데이터를 사용하려면 data-downloadable을 yes로 지정하고, data-url 속성에 외부 데이터의 URL을 지정하면 된다. 

	=object banner: name="ads", data-downloadable=yes, data-url="http://www.munhak.com/ads"

## 쇼케이스(Showcase) 오브젝트

쇼케이스(Showcase) 오브젝트란 말그대로 진열장이다. 쇼케이스 오브젝트를 이용하여 여러 개의 상품이나 컨텐츠들을 늘어놓고 진열할 수 있다. 쇼케이스 오브젝트는 격자형 모양으로 상품들을 진열하는 데, 격자의 한 칸을 가리켜 셀(cell)이라고 하며, 각 셀은 sbml을 이용하여 표현한다. 쇼케이스 오브젝트는 고정 크기이거나 가로/세로 스크롤이 가능하도록 지정할 수 있다. 쇼케이스 오브젝트 내에 포함된 셀들은 정렬이 가능하며, 정렬의 기준은 sortkey와 sortorder 속성을 이용하여 변경할 수 있다. 쇼케이스 오브젝트는 헤더(header)와 푸터(footer), 툴바(toolbar)를 포함할 수 있는데, 이들의 내용은 각각 sbml로 표현한다. 

### 사용예

	=object showcase: name="magazine"

### 외부 데이터를 사용하는 방법

쇼케이스 오브젝트는 외부 데이터를 사용하여 셀의 내용을 채워넣는 기능을 지원한다. 외부 데이터는 웹(HTTP/S)을 통해 액세스 가능해야 하며, 요청에 대한 응답으로 json으로 표현된 데이터를 전송해야 한다. 웹 요청은 POST 방식을 사용하며, 요청하는 데이터의 범위(시작위치, 갯수)를 파라미터로 전달할 수 있다. 요청받은 범위가 실제 데이터의 범위를 벗어나면, 빈 json 데이터와 함께 성공 응답(200)을 해야 한다. 데이터 범위를 파라미터로 전달하지 않으면, 모든 데이터를 한번에 포함하여 응답한다. 쇼케이스 오브젝트에서 외부 데이터를 사용하려면 data-downloadable을 yes로 지정하고, data-url 속성에 외부 데이터의 URL을 지정하면 된다. 쇼케이스 오브젝트에 Load more 기능이 활성화되어 있다면(loads-more=yes), 데이터의 범위를 지정하여 외부 데이터를 순차적으로 한 페이지씩 불러올 수 있다.

	=object showcase: name="magazine", data-downloadable=yes, data-url="http://www.munhak.com/magazine", loads-more=yes

## 카드(Cards) 오브젝트

## 셀(Cell) 오브젝트

