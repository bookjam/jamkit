## 타이머 사용하기

타이머는 지정된 시간이 지나면 이벤트를 발생시키는 오브젝트다. 시간은 time 속성으로 지정할 수 있으며 지정된 시간이 지나면 action-when-expired가 실행된다. 아래는 3초 뒤에 "시간이 초과되었습니다."라는 경고창을 띄어주는 예제이다.

	=object timer: time=3, action-when-expired=alert, params-when-expired="message=\"시간이 초과되었습니다.\""

타이머의 시간을 지정하는 형식은 일반적인 시간 기술 방식(00:00:00)을 따른다. 예를 들어 time 속성을 1:05라고 지정하면 1분 5초를 가리키고 1:00:05는 1시간 5초를 가리킨다. 밀리 초 단위를 지정하려면 소수점(.)으로 표현하면 된다. 1:05.500라고 지정하면 1분 5초 500밀리를 가리킨다.

타이머 오브젝트에 repeats 속성을 yes로 지정하면 time에 지정된 시간 간격으로 반복적인 이벤트를 발생시킬 수 있다. 타이머 오브젝트에 cancel 명령을 내리거나 오브젝트 자체가 비활성화 될 때까지 끊임없이 이벤트가 발생한다. 

	=object timer: time=3, repeats=yes, ...

만약 이벤트 발생하는 횟수를 지정하고 싶다면 repeats 대신 repeat-count를 사용하면 된다. repeat-count를 3으로 지정하면 동일한 시간 간격으로 3번까지 이벤트가 발생한다.

	=object timer: time=3, repeat-count=3, ...

기본적으로 타이머 오브젝트는 화면에서 활성화되는 시점부터 동작하도록 되어있다. 만약 타이머 오브젝트에 start 명령을 내리기 전까지 동작을 유보하고 싶다면 autostart 속성을 no로 지정하면 된다.

	=object timer: time=3, autostart=no, ...

타이머 오브젝트가 제공하는 명령은 start와 cancel, expire가 있다. start는 타이머를 새로 시작하는 명령이며 cancel은 타이머를 취소하는 명령이다. expire는 남은 시간에 관계없이 즉시 이벤트를 발생시키는 명령이다. 

	action=start, target=object, object=타이머오브젝트ID
	action=cancel, target=object, object=타이머오브젝트ID
	action=expire, target=object, object=타이머오브젝트ID

타이머의 동작 시간을 화면에 표시하고 싶다면 라벨 오브젝트를 사용하면 된다. 라벨 오브젝트의 type 속성을 timer로 지정하고 owner 속성에 타이머 오브젝트의 ID를 지정하면 지정된 타이머의 남은 시간이 라벨 오브젝트에 표시된다. 

	=object label: type=timer, owner=타이머오브젝트ID

라벨 오브젝트에 표시되는 기본 [시간 표현 형식](https://developer.android.com/reference/java/text/SimpleDateFormat.html)은 HH:mm:ss이다. 만약 시간 표현 형식을 변경하려면 format 속성으로 지정하면 된다. 

	=object label: type=timer, format='s초가 남았습니다.', ...
