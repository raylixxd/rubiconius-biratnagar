			$(document).ready(function() {
				

				
				/*
				setTimeout(function(){ 
				$(".amazigh").css("display","block");
				}, 3000);
				*/
				
				
				$("html").mousemove(function(e){
					$(".bodyOver").css('background-position',(e.pageX - 1500)+'px '+(e.pageY - 1500)+'px');
				});
				
				
/* 
beu...
					$(".bodyOver").click(function() {
						
					   $(".corpInside").click();
					   return false;
					});
					
					
				$( ".corpInside" ).click(function() {
			  	
				});
				*/
		
			});
			
			
			// Animation show aroundko.fr
			function flashlightout(){
				// console.log("####");
				$(".bodyOver").animate({'opacity':0},15000);
				$(".amazigh").css("pointer-events","none");
				$(".amazigh").animate({'opacity':0},1000);
			}
			
			
			
			// Function mouseover image
			function flashMediaMouseOverSettle(){
				// console.log("flashMediaMouseOverSettle");
				$(".corpInsideImage").css("z-index","99990");
				
					// Image go z-index top on overflow
					$(".corpInsideImage .corpMediaInner").mouseenter(function() {
						// console.log("in");
						//$(".corpInsideImage").css("z-index","99999");
					}).mouseleave(function() {
						// console.log("out");
						//$(".corpInsideImage").css("z-index","99990");
					});				
			}
			
			
			// function switch
			function flashSwith(direction){
				if(flash){
					$(".bodyOver").stop().animate({'opacity':0},500,function(){
						$(".bodyOver").css("display","none");
					});			
					flash=0;
				
					$(".amazigh").css("display","none");
					$(".creditsFlash .creditsFlashOn").removeClass("on");
					
				}else{
					$(".bodyOver").css("display","block");
					$(".bodyOver").css("opacity",0);
					$(".bodyOver").stop().animate({'opacity':1},500,function(){
						$(".amazigh").css("display","block");
						$(".amazigh").addClass("display_none");
						$(".amazigh").removeClass("display_none");
					});
					flash=1;
					$(".creditsFlash .creditsFlashOn").addClass("on");
					
				}
			}
			
			
			// intro select
		function introFlash(){
			if( !flash ){
				
			// console.log("######### flash 1 ");
				$(".introFlashOff").removeClass("off");
				$(".introFlashOn").addClass("off");
				flashSwith(1);
			}else{
				// console.log("######### flash 2 ");
				$(".introFlashOff").addClass("off");
				$(".introFlashOn").removeClass("off");
				flashSwith(0);
			}
		}