/**
 * Created with JetBrains WebStorm.
 * User: zhang.yt
 * Date: 13-9-5
 * Time: 上午10:34
 * To change this template use File | Settings | File Templates.
 */
var Bind = function (target,event,callback){
    if(target.addEventListener){
        target.addEventListener(event,callback,false);
    }

    },
    unBind = function (target,event){
    target.removeEventListener(event);
    },
    Awsc = (function  (){
        var queueDom = [],
            queueAni = [],
            timer ,
            index,
            Ani,
            transitionEnd,
            whichTransitionEvent= function(el){
                var t;
                var transitions = {
                    'transition':'transitionend',
                    'OTransition':'oTransitionEnd',
                    'MozTransition':'transitionend',
                    'WebkitTransition':'webkitTransitionEnd'
                }

                for(t in transitions){
                    if( el.style[t] !== undefined ){
                        return transitions[t];
                    }
                }
            },
            loop = function(){
                var ele = this,index = queueDom.indexOf(ele);
                if(~index){
                    Ani = queueAni[index];
                    ele.style.cssText = 'left:'+(Ani.offset*Ani.direction)+'px';
                    Ani.direction = Ani.direction?0:1 ;
                }
            };
        return {
            'add':function(ele,offset){
                index = queueDom.indexOf(ele);
                if(!~index){
                    queueDom.push(ele);
                    queueAni.push({
                        offset:offset,
                        direction:1
                    });
                    transitionEnd = transitionEnd || whichTransitionEvent(ele);
                    ele.addEventListener(transitionEnd, loop);
                }
                if(!ele.classList.contains('m-wsc')){
                    ele.classList.add('m-wsc');
                    loop.call(ele);
                }
            },
            'remove':function(ele){
                index = queueDom.indexOf(ele);
                if(~index){
                    queueAni[index].direction = 1;
                    ele.classList.remove('m-wsc');
                    ele.style.cssText = '';
                }
            }
        }
    })();

var npr = angular.module('npr',[]),
    apiKey = 'MDEyMTIzNTAyMDEzNzgyNTk0NzI2Mzk1MQ001',
    nprUrl = 'http://api.npr.org/query?id=61&output=JSON&fields=relatedLink,title,byline,text,audio,image,pullQuote,all';

npr.factory('nprService',['$http',function($http){
    var doRequest = function(apiKey,condition){
            return $http({
                method:'JSONP',
                url:nprUrl+'&apiKey='+apiKey+'&callback=JSON_CALLBACK'
            });
        };
    return {
        programs : function(apiKey){ return doRequest(apiKey);}
    }
}]);

npr.factory('audio',['$document',function($document){
    var audio = $document[0].createElement('audio');
    return audio;
}]);

npr.factory('player',['audio','$rootScope',function(audio,$rootScope){
    var player = {
        playing:false,
        current:null,
        ready:false,
        title: '',

        playAction:function(program){

            if(program !== player.current){
                player.stop();
                player.play(program);
            }else{
                if(player.current.status === 'play' ){
                    player.pause();
                }else{
                    player.play();
                }
            }
        },
        play:function(program){
            if(program ){
                var url = program.audio[0].format.mp4.$text;
                player.title = program.title;
                audio.src = url;
                player.current = program;
            }
            player.current.status = 'play';
            player.playing = true;
            audio.play();
        },
        stop:function(){
            if(player.current){
                audio.pause();
                player.ready =  false;
                player.current.status = 'stop';
                player.current.percent= '0%';
                player.current = null;
                player.playing = false;
            }
        },
        pause:function(){
            audio.pause();
            player.current.status = 'pause';
            player.playing = false;
        },
        crtTime:function(){
            return audio.currentTime;
        },
        crtDuration:function(){
            return audio.duration;
        }
    };
    Bind(audio,'canplay',function(){
        $rootScope.$apply(function(){
            player.ready = true;
        });
    });
    Bind(audio,'timeupdate',function(event){
       $rootScope.$apply(function(){
           player.played = player.crtTime();
           player.current.percent =  ((player.crtTime() / player.crtDuration())*100)+'%';
       });
    });

    Bind(audio,'ended',function(){
        $rootScope.$apply(function(){
            var index = $rootScope.programs.indexOf(player.current);
            if($rootScope.programs[index+1]){
                player.play($rootScope.programs[index+1]);
            }else{
                player.stop();
            }
        });
    });
    return player;
}]);

npr.filter('duration',function(){
    return function(d){
        d = parseInt(d,10) || 0;
        var m = parseInt(d / 60,10),s = (d %60);
        m = (m/Math.pow(10,2)).toFixed(2).slice(2);
        s = (s/Math.pow(10,2)).toFixed(2).slice(2);
        return m+':'+s;
    }
});

npr.directive('nprlist',function(){
    return {
        restrict:'A',
        require:['^ngModel'],
        templateUrl:'nprList.html',
        replace:true,
        scope:{
            program: '=ngModel',
            player: '=player'
        },
        link:function(scope,ele,attrs){
            var mName = ele[0].querySelector('.m-name'),offset,isEnter = false,unWatch;
            var aniWordAdd = function(){
                if(offset === undefined){
                    offset = 205 - mName.getBoundingClientRect().width;
                    if(offset > -1){
                        ele.unbind('mouseover').unbind('mouseout');
                        unWatch();
                        return false;
                    }
                }
                Awsc.add(mName,offset);
            },
                aniWordRemove = function(){
                    if(scope.program.status === 'stop' || isEnter){
                        Awsc.remove(mName);
                    }

            };

            unWatch = scope.$watch('program.status',function(oldVal,newVal){

                if(scope.program.status !== 'stop'){
                    aniWordAdd();
                }else{
                    aniWordRemove();
                }
            });

            ele.bind('mouseover',function(e){
                e.stopPropagation();
                aniWordAdd();
                isEnter = true;
            })
                .bind('mouseout',function(e){
                    e.stopPropagation();
                    isEnter = false;
                    aniWordRemove();
                });
        }
    }
});

npr.controller('PlayerCtrl',['$scope','player','nprService',function($scope,player,nprService){
    nprService.programs(apiKey).success(function(data){
        $scope.programs = [];
        angular.forEach(data.list.story,function(program){
            program.status = 'stop'; //stop pause play
            program.duration = program.audio[0].duration.$text;
            program.percent = '0%';
            program.played = 0;
            program.title = program.title.$text;
            $scope.programs.push(program);
        });
    }).error(function(data,status){});
    $scope.player = player;

    $scope.play = function(){
        $scope.player.play(player.current || $scope.programs[0]);
    }
    $scope.stop = function(){
        $scope.player.stop();
    }
}]) ;