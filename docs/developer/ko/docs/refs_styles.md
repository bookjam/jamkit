## 텍스트 레이아웃 속성

속성 | 타입(허용값) | 기본값 | 단위 | 적용대상 | @-suffixes | Cascades? | 설명
--- | --- | --- | ---  | ---  | ---  | --- | ---
text-align | justified / left / center / right | justified | | section | | 예 | 
text-indent | Float | 0 | dp, em | section | | 예 | 
text-justify | auto / distribute-all-lines | auto | | section | | 예 | text-align=justify 인 경우 사용됨
vertical-align | baseline / top / middle / bottom | baseline | | section | | 아니오 | 
line-spacing | Float | 0.6em | dp, em | section | | 예 | 
line-height | Float | 1.6em | dp, em | section | | 예 | 
paragraph-spacing | Float | 0 | dp, em | section | | 예 | 
spacing | Float | 0 | dp, em | section | | 예 | 한개 또는 두개의 값을 가짐
spacing-no-scale | Boolean | no | | section | | 예 | 
empty-line-height | Float | 1em | dp, em | section | | 예 | 
line-break-mode | auto / word-wrap / cahracter-wrap | auto | | section | | 예 | 

## 박스 레이아웃 속성

속성 | 타입(허용값) | 기본값 | 단위 | 적용대상 | @-suffixes | Cascades? | 설명
--- | --- | --- | ---  | ---  | ---  | --- | ---
margin | Side | "0 0 0 0" | dp, em, layout의 상대값 | section / object | | 아니오 | 축약형 사용 가능. 예) "1em", "1em 20dp", "1em 1.5em 0 1.2em"
margin-top | Float | 0 | dp, em, layout의 상대값 | section / object | | 아니오 | 
margin-bottom | Float | 0 | dp, em, layout의 상대값 | section / object | | 아니오 | 
margin-left | Float | 0(0.2em) | dp, em, layout의 상대값 | section / object | verso / recto | 아니오 | display=list-item 인 경우 기본값이 0.2em. verso / recto suffix는 object에만 적용됨
margin-right | Float | 0 | dp, em, layout의 상대값 | section / object | verso / recto | 아니오 | verso / recto suffix는 object에만 적용됨
padding | Side | "0 0 0 0" | dp, em, layout의 상대값 | section / object | | 아니오 | 축약형 사용 가능. 예) "1em", "1em 20dp", "1em 1.5em 0 1.2em"
padding-top | Float | 0 | dp, em, layout의 상대값 | section / object | | 아니오 | 
padding-bottom | Float | 0 | dp, em, layout의 상대값 | section / object | | 아니오 | 
padding-left | Float | 0(1.5em) | dp, em, layout의 상대값 | section / object | | 아니오 | display=list-item 인 경우 기본값이 1.5em.
padding-right | Float | 0 | dp, em, layout의 상대값 | section / object | | 아니오 | 

## 페이지 레이아웃 속성

속성 | 타입(허용값) | 기본값 | 단위 | 적용대상 | @-suffixes | Cascades? | 설명
--- | --- | --- | ---  | ---  | ---  | --- | ---
page-margin-top | Float | 0 | dp, em, layout의 상대값 | page | | 예 | 
page-margin-bottom | Float | 0 | dp, em, layout의 상대값 | page | | 예 | 
begin-new-page | Boolean | no | | section | | 아니오 | 
page-side | auto / verso / recto | no | | section / object | | 아니오 | 
display | section / block / list / list-item / none | section | | section | | 아니오 | 
display | block / none | block | | object | | 아니오 | 
position | static / top / bottom / absolute | static | | object | | 아니오 | top / bottom인 경우 항상 adaptive=yes 처럼 동작
align | left / center / right | center | | object | verso / recto | 아니오 | position=static / top / bottom인 경우에 사용됨. flow=yes인 경우, center 값을 사용할 수 없음
adaptive | Boolean | no | | object | | 아니오 | position=static인 경우에만 유효함.
flow | Boolean | no | | object | | 아니오 | 
clear | Boolean | no | | section | | 아니오 | 
pack | Boolean | no | | section | | 아니오 | 
gravity | left-top / left-bottom / right-top / right-bottom / top / right / bottom / left / center | left-top | | object | | 아니오 | position=absolute 인 경우에만 유효함.
x | Float | 0 | dp, em, layout의 상대값 | object | | 아니오 | position=absolute 인 경우에만 유효함.
y | Float | 0 | dp, em, layout의 상대값 | object | | 아니오 | position=absolute 인 경우에만 유효함.
width | Float | 0 | dp, em, layout의 상대값, % | object | | 아니오 | position=absolute 인 경우에만 유효함.
height | Float | 0 | dp, em, layout의 상대값, % | object | | 아니오 | position=absolute 인 경우에만 유효함.


## 텍스트 렌더링 속성

속성 | 타입(허용값) | 기본값 | 단위 | 적용대상 | @-suffixes | Cascades? | 설명
--- | --- | --- | ---  | ---  | ---  | --- | ---
text-color | Color | #000000 | | section | | 예 | 
text-decoration | none / underline / overline / line-through / side-dot | | | section | | 아니오 | 
highlight-color | Color | 투명 | | section | | 예 | 
font | "[weight] [style] size family" | | | section | | 예 | weight, style 은 생략 가능. 예) "bold 1.2em sans-serif", "0.7 monospace"
font-family | serif / sans-serif / monospace / 글꼴 이름 | serif| | section | | 예 | 콤마(,)로 구분하여 여러 값 입력 가능. 예) "맑은 고딕, 굴림, sans-serif"
font-size | Float | 1.0 | em | section | | 예 | 
font-weight | normal / bold | normal | | section | | 예 | 
font-style | normal / italic | normal | em | section | | 예 | 
font-no-scale | Boolean | no | | section | | 예 | 
font-no-fullwidth-bracket | Boolean | no | | section | | 예 | 

## 페이지 렌더링 속성

속성 | 타입(허용값) | 기본값 | 단위 | 적용대상 | @-suffixes | Cascades? | 설명
--- | --- | --- | ---  | ---  | ---  | --- | ---
page-background | 파일명 혹은 Color | 투명 | | page | verso / recto | 예 | 
page-background-color | Color | 투명 | | page | verso / recto | 예 | 
page-background-image | 파일명 | | | page | verso / recto | 예 | 
page-background-image-type | stretch / pattern / 3-patch | pattern | | page | verso / recto | 예 | 
page-header-hidden | Boolean | no | | page | | 아니오 | 
page-footer-hidden | Boolean | no | | page | | 아니오 | 
page-footer-color | Color | #606060 | | page | | 아니오 | 
page-number-color | Color | #101010 | | page | | 아니오 | 

## 보더 렌더링 속성

속성 | 타입(허용값) | 기본값 | 단위 | 적용대상 | @-suffixes | Cascades? | 설명
--- | --- | --- | ---  | ---  | ---  | --- | ---
border-width | Side | "0 0 0 0" | dp, em, layout의 상대값 | section / object | | 아니오 | 축약형 사용 가능. 예) "1em", "1em 20dp", "1em 1.5em 0 1.2em"
border-top-width | Float | 0 | dp, em, layout의 상대값 | section / object | | 아니오 | 
border-bottom-width | Float | 0 | dp, em, layout의 상대값 | section / object | | 아니오 | 
border-left-width | Float | 0 | dp, em, layout의 상대값 | section / object | verso / recto | 아니오 | 
border-right-width | Float | 0 | dp, em, layout의 상대값 | section / object | verso / recto | 아니오 | 
border-color | Color | #000000 | | section / object | | 아니오 | 
border-top-color | Color | #000000 | | section / object | | 아니오 | 
border-bottom-color | Color | #000000 | | section / object | | 아니오 | 
border-left-color | Color | #000000 | | section / object | | 아니오 | 
border-right-color | Color | #000000 | | section / object | | 아니오 | 
border-style | solid / stitch / dotted / dashed / dash-?-? | "solid solid solid solid" | | section / object | | 아니오 | 축약형 사용 가능. 예) "1em", "1em 20dp", "1em 1.5em 0 1.2em"
border-top-style | solid / stitch / dotted / dashed / dash-?-? | solid | | section / object | | 아니오 | 
border-bottom-style | solid / stitch / dotted / dashed / dash-?-? | solid | | section / object | | 아니오 | 
border-left-style | solid / stitch / dotted / dashed / dash-?-? | solid | | section / object | | 아니오 | 
border-right-style | solid / stitch / dotted / dashed / dash-?-? | solid | | section / object | | 아니오 | 

## 블릿 렌더링 속성

속성 | 타입(허용값) | 기본값 | 단위 | 적용대상 | @-suffixes | Cascades? | 설명
--- | --- | --- | ---  | ---  | ---  | --- | ---
bullet-text | %n / %i / %I | %n | | section | | 아니오 | display=list / list-item 인 경우에만 유효함.
bullet-font | "[weight] [style] size family" | 부모섹션의 값 | | section | | 아니오 | display=list / list-item 인 경우에만 유효함. weight, style 은 생략 가능
예) "bold 1.2em sans-serif", "0.7 monospace"
bullet-font-family | serif / sans-serif / monospace / 글꼴 이름 | 부모섹션의 값 | | section | | 아니오 | display=list / list-item 인 경우에만 유효함. 콤마(,)로 구분하여 여러 값 입력 가능. 예) "맑은 고딕, 굴림, sans-serif"
bullet-font-size | Float | 부모섹션의 값 | em | section | | 아니오 | display=list / list-item 인 경우에만 유효함.
bullet-font-weight | normal / bold | 부모섹션의 값 | | section | | 아니오 | display=list / list-item 인 경우에만 유효함.
bullet-font-style | normal / italic | 부모섹션의 값 | em | section | | 아니오 | display=list / list-item 인 경우에만 유효함.
bullet-font-no-scale | Boolean | 부모섹션의 값 | | section | | 아니오 | display=list / list-item 인 경우에만 유효함.
