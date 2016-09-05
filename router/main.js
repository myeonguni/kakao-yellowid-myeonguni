/**
 * Created by http://myeonguni.com on 2016-09-02.
 */

module.exports = function(app, fs)
{	
	// 키보드
	app.get('/keyboard', function(req, res){
        fs.readFile( __dirname + "/../data/" + "keyboard.json", 'utf8', function (err, data) {
           console.log( data );
           res.end( data );
        });
    });
	
	// 메시지
	app.post('/message', function(req, res){
		var result = {  };
		
		// CHECK REQ VALIDITY
        if(!req.body["user_key"] || !req.body["type"] || !req.body["content"]){
            result["success"] = 0;
            result["error"] = "invalid request";
            res.json(result);
            return;
        }
		
		// 초기 keyboard 버튼일 경우(도움말||시작하기||만든이)
		if(req.body["content"] == "도움말" || req.body["content"] == "시작하기" || req.body["content"] == "만든이"){
			fs.readFile( __dirname + "/../data/message.json", 'utf8',  function(err, data){
				var messages = JSON.parse(data);
				// 각 keyboard 버튼에 따른 응답 메시지 설정
				if(req.body["content"] == "도움말"){
					messages["message"] = {"text" : "맞춤법검사를 하고 싶은 내용을 작성하여 보내시면 맞춤법이 검사 결과가 반환됩니다."};
				}else if(req.body["content"] == "시작하기"){
					messages["message"] = {"text" : "오늘 하루도 행복한 하루되세요. *^^*"};
				}else{
					messages["message"] = {"text" : "명우니닷컴(http://myeonguni.com)에서 개발하였습니다."};
				}
				fs.writeFile(__dirname + "/../data/message.json",
							 JSON.stringify(messages, null, '\t'), "utf8", function(err, data){
				})
				fs.readFile( __dirname + "/../data/message.json", 'utf8', function (err, data) {
					// 결과 로그 출력
					console.log("Request_user_key : "+req.body["user_key"]);
					console.log("Request_type : keyboard - "+req.body["content"]);
					res.end(data);
					return;
				})
			})
		}else { // 아닐 경우 맞춤법검사기 실시
			var request = require('request'); //get방식으로 request에 대한 response를 받기위해
			var encodeURISafe = require('encodeuri-safe'); //get방식에 쓰일 파라미터 값을 인코딩하기 위해
			var param = encodeURISafe.encodeURIComponent(req.body["content"]);
			var options = {
			  url: ''+param, //비공개
			  headers: {
				'User-Agent': 'request'
			  }
			};
			
			function callback(error, response, body) {
				// 에러 체크
				if(error) return console.log('Error:', error);
				// 상태 값 체크
				if(response.statusCode !== 200)	return console.log('Invalid Status Code Returned:', response.statusCode);
				
				/*
				 * (반환 값 1차 가공)
				 *   - window.__jindo2_callback._spellingCheck_0({"message":{"@type":"response","@service":"DBSearchSpellchecker","@version":"1.1.0","result":{ "errata_count":0,"html":"data"}}});
				 * (반환 값 2차 가공)
				 *   - <span class='re_red'>...</span> - 맞춤법
				 *   - <span class='re_green'>...</span> - 띄어쓰기
				 *   - <span class='re_puple'>...</span> - 표준어 의심단어
				 * (반환 값 3차 가공)
				 *   - 알맞은 JSON 포맷으로 바꿔줌
				*/
				body = body.substring(body.indexOf("\"html\":")+8, body.length-6);
				body = body.replace(/<span class='re_red'>/g, '');
				body = body.replace(/<span class='re_green'>/g, '');
				body = body.replace(/<span class='re_purple'>/g, '');
				body = body.replace(/<\/span>/g, '');
				var bodyTemp = body;
				body = {"text" : body};
				
				// 파일 입출력
				fs.readFile( __dirname + "/../data/message.json", 'utf8',  function(err, data){
					var messages = JSON.parse(data);
					// 맞춤법검사 결과 저장 및 번환
					messages["message"] = body;
					fs.writeFile(__dirname + "/../data/message.json",
								 JSON.stringify(messages, null, '\t'), "utf8", function(err, data){
					})
					fs.readFile( __dirname + "/../data/message.json", 'utf8', function (err, data) {
						// 결과 로그 출력
						console.log("Request_user_key : "+req.body["user_key"]);
						console.log("Before : "+req.body["content"]);
						console.log("After  : "+bodyTemp);
						res.end(data);
						return;
					})
				})
			}
			
			request(options, callback);
		}
    });
	
	// 친구추가
	app.post('/friend', function(req, res){
        var result = {  };
		
		// 요청 param 체크
        if(!req.body["user_key"]){
            result["success"] = 0;
            result["error"] = "invalid request";
            res.json(result);
            return;
        }
		
		// 파일 입출력
        fs.readFile( __dirname + "/../data/friend.json", 'utf8',  function(err, data){
            var users = JSON.parse(data);
			// 이미 존재하는 친구일 경우
            if(users[req.body["user_key"]]){
                result["success"] = 0;
                result["error"] = "duplicate";
                res.json(result);
                return;
            }
            // 친구추가
            users[req.body["user_key"]] = req.body;
            fs.writeFile(__dirname + "/../data/friend.json",
                         JSON.stringify(users, null, '\t'), "utf8", function(err, data){
                result = 200;
                res.json(result);
                return;
            })
        })
    });
	
	// 친구삭제(차단)
	app.delete('/friend/:user_key', function(req, res){
        var result = { };
		
        // 파일 입출력
        fs.readFile(__dirname + "/../data/friend.json", "utf8", function(err, data){
            var users = JSON.parse(data);
 
            // 존재하지 않는 친구일 경우
            if(!users[req.params.user_key]){
                result["success"] = 0;
                result["error"] = "not found";
                res.json(result);
                return;
            }
			// 친구 삭제
            delete users[req.params.user_key];
            fs.writeFile(__dirname + "/../data/friend.json",
                         JSON.stringify(users, null, '\t'), "utf8", function(err, data){
                result = 200;
                res.json(result);
                return;
            })
        })
    })
	
	// 채팅방 나가기
	app.delete('/chat_room/:user_key', function(req, res){
        var result = { };
		result = 200;
		res.json(result);
		return;
    })
}
