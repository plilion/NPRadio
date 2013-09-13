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
                if(!ele.classList.contains('wordscroll')){
                    ele.classList.add('wordscroll');
                    loop.call(ele);
                }
            },
            'remove':function(ele){
                index = queueDom.indexOf(ele);
                if(~index){
                    queueAni[index].direction = 1;
                    ele.classList.remove('wordscroll');
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
    return angular.element(audio);
}]);
npr.factory('playStatus',function(){
    return ['stop','play','pause','loading'];
});
npr.factory('player',['audio','$rootScope','playStatus',function(audio,$rootScope,status){
    /*
    * 操作：播放 暂停 设置进度 调音
    * 状态：当前时间 总时间 播放器状态
    * */
     var audioEl = audio[0],current = null,nullPlayInfo = {
         status:status[0],
         duration:0,
         currentTime:0,
         title:0
     },current = nullPlayInfo;
     var player = {
        status:'stop',//stop pause playing loading
        ready:false,
        currentTime:0,
        duration:0 ,
        status:status[0],
        playInfo :nullPlayInfo,
        play:function(program){
            player.playInfo = program;
            audioEl.src = program.url;
            audioEl.play();
        },
        stop:function(){

            audioEl.pause();
            player.ready =  false;
            current.status = status[0];
            current.currentTime =  0;
            current = player.playInfo = nullPlayInfo;
        },
        pause:function(){
            audioEl.pause();
            player.status = status[2];
            player.playing = false;
        },
        rePlay:function(){
          audio.play();
        },
        readyPlay:function(program){
            current = program;
        },
        programAction:function(program){
            if(player.playInfo === program){
                player.pause();
            }else{
                player.play(program);
            }
        },
        playAction : function(){
        if(current.status === status[0]){
            player.play(current);
        }
         if(current.status  === status[1]){
             player.pause();
         }
         if(current.status  === status[2]){
             player.rePlay();
         }
     }
    };
    audio.bind('canplay',function(){
        $rootScope.$apply(function(){
            player.ready = true;
        });
        }).bind('play',function(){
            $rootScope.$apply(function(){
                current.status = status[1];
            });
        }).bind('pause',function(){
            $rootScope.$apply(function(){
                current.status = status[2];
            });
        }).bind('timeupdate',function(e){
            $rootScope.$apply(function(){

                current.currentTime = audioEl.currentTime;
            });
        }).bind('ended',function(){
            $rootScope.$apply(function(){
                current.status = status[0];
                current.currentTime = 0;
            });
        });
    return player;
}]);

npr.filter('fTime',function(){
    return function(d){
        d = parseInt(d,10) || 0;
        var m = parseInt(d / 60,10),s = (d %60);
        m = (m/Math.pow(10,2)).toFixed(2).slice(2);
        s = (s/Math.pow(10,2)).toFixed(2).slice(2);
        return m+':'+s;
    }
});
npr.filter('progress',function(){
    return function(played,duration){
        played = parseFloat(played,10);
        duration = parseInt(duration,10);
        if(isNaN(duration)){
            return '0%';
        }
        return ((played/duration)*100) + '%';
    }
});
npr.directive('programView',function(){
    return {
        restrict:'A',


        link:function(scope,ele,attrs){

            var mName = ele[0].querySelector('.pro-name'),offset,isEnter = false,unWatch;
            var aniWordAdd = function(){
                if(offset === undefined){
                    offset = 250 - mName.getBoundingClientRect().width;
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
            }).bind('mouseout',function(e){
                e.stopPropagation();
                isEnter = false;
                aniWordRemove();
            });
        }
    }
});

npr.controller('PlayerCtrl',['$scope','player','nprService','playStatus',function($scope,player,nprService,status){

    $scope.programs = [];
    nprService.programs(apiKey).success(function(data){
        var playInfo;
        angular.forEach(data.list.story,function(program){
            playInfo = {
                title:program.title.$text,
                url:program.audio[0].format.mp4.$text,
                status:status[0],
                duration:program.audio[0].duration.$text,
                currentTime:0
            }
            $scope.programs.push(playInfo);
        });
    }).error(function(data,status){});


    $scope.player = player;
    $scope.player.readyPlay($scope.programs[0]);



    $scope.programAction = function(program){

        $scope.player.play(program);
    }

}]) ;