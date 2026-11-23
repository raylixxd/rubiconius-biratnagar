function plp_open(menu_lvl, menu_lvl_parent, menu_id){
	typeOpenning=1;
	// console.log('menu_lvl:- ' + menu_lvl);
	// console.log('menu_lvl_parent:- ' + menu_lvl_parent);
	// console.log('menu_id:- ' + menu_id);
	// console.log('==========================================');

	if(menu_lvl==plp_level_1_open && plp_menu_1_open==menu_id){openning='no'; typeOpenning=2;}
	if(menu_lvl==plp_level_2_open && plp_menu_2_open==menu_id){openning='no'; typeOpenning=3;}

	// console.log('typeOpenning:- ' + typeOpenning);
	// console.log('plp_level_1_open:- ' + plp_level_1_open);
	// console.log('plp_level_2_open:- ' + plp_level_2_open);

	// console.log('plp_menu_heigh initial:- ' , plp_menu_heigh);
	// console.log('==========================================');
	
	if(typeOpenning==1){
		// console.log('====================== Level 1 =====================');
		// display crose
		if(menu_lvl==1){
			temp_display='lvlat_'+menu_id;
			temp_hide='lvlat_'+plp_menu_1_open;
		}
		
		if(menu_lvl==2){
			temp_display='lvlbt_'+menu_id;
			temp_hide='lvlbt_'+plp_menu_2_open;
		}

		$("#"+temp_hide+" .plmenu_icone").html('');
		$("#"+temp_display+" .plmenu_icone").html('<div class="plmenu_icone_inner"><!----></div>');
		
		// open
		if(menu_lvl==1){
			temp_open='lvla'+menu_id;
			temp_close='lvla'+plp_menu_1_open;
		}
		
		if(menu_lvl==2){
			temp_open='lvla'+2+'lvlb'+menu_id;
			temp_close='lvla'+menu_lvl_parent+'lvlb'+plp_menu_2_open;
		}

		// console.log('temp_open:- #' +temp_open);
		// console.log('temp_close:- #' +temp_close);
		
		temp_height=(plp_menu_heigh[menu_lvl+''+menu_id]*15);
		$("#"+temp_open).animate({height:temp_height},125);
		$("#"+temp_close).animate({height:0},125);

		// console.log('temp_height:- #' +temp_height);
		// console.log('==========================================');
		
		// RE:height lvl 2
		if(menu_lvl==2){
			temp_height=(plp_menu_heigh[menu_lvl+''+menu_id]*15)+(plp_menu_heigh[1+''+menu_lvl_parent]*15);
			$("#lvla"+menu_lvl_parent).animate({height:temp_height},125);
		}
		
		// Close lvl 2 
		if(menu_lvl==1){
			$("#lvlbt_"+plp_level_2_open+" .plmenu_icone").html('');
			$("#lvla"+plp_level_2_open+"lvlb"+plp_menu_2_open).animate({height:0},125);
			plp_level_2_open=0;
			plp_menu_2_open=0;
		}
				
		// data
		if(menu_lvl==1){
			plp_level_1_open=menu_lvl;
			plp_menu_1_open=menu_id;
		}
		if(menu_lvl==2){
			plp_level_2_open=menu_lvl;
			plp_menu_2_open=menu_id;
		}
	}
	
	// close only
	if(typeOpenning==2) {
		// console.log('====================== Level 2 =====================');
		// display crose
		// display crose
		
		temp_hide='lvlat_'+plp_menu_1_open;
		$("#"+temp_hide+" .plmenu_icone").html('');
	
		temp_hide='lvlbt_'+plp_menu_2_open;
		$("#"+temp_hide+" .plmenu_icone").html('');
		
		// open
		temp_close='lvla'+plp_menu_1_open;
		$("#"+temp_close).animate({height:0},125);
	
		temp_close='lvla'+menu_lvl_parent+'lvlb'+plp_menu_2_open;
		$("#"+temp_close).animate({height:0},125);
		
				
		// RE:height lvl 2
		if(menu_lvl==2){
			
			temp_height=(plp_menu_heigh[menu_lvl+''+menu_id]*15)+(plp_menu_heigh[1+''+menu_lvl_parent]*15);
			$("#lvla"+menu_lvl_parent).animate({height:temp_height},125);
		}
		
		// Close lvl 2 
		if(menu_lvl==1){
			$("#lvlbt_"+plp_level_2_open+" .plmenu_icone").html('');
			$("#lvla"+plp_level_2_open+"lvlb"+plp_menu_2_open).animate({height:0},125);
			plp_level_2_open=0;
			plp_menu_2_open=0;
		}
				
		// data		
		plp_level_1_open=0;
		plp_menu_1_open=0;
		plp_level_2_open=0;
		plp_menu_2_open=0;
	}
	
	if(typeOpenning==3){
		// console.log('====================== Level 3 =====================');
		// display crose
		temp_hide='lvlbt_'+plp_menu_2_open;
		$("#"+temp_hide+" .plmenu_icone").html('');
				
		// open
		temp_open='lvla'+plp_menu_1_open;
		temp_height=(plp_menu_heigh[plp_level_1_open+''+plp_menu_1_open]*15);
		$("#"+temp_open).animate({height:temp_height},125);
			
		temp_close='lvla'+2+'lvlb'+plp_menu_2_open;
		$("#"+temp_close).animate({height:0},125);

		// console.log('temp_open 3:- ' + temp_open);
		// console.log('temp_close 3:- ' + temp_close);
		// console.log('temp_height 3:- ' + temp_height);
		
		// data
		plp_level_2_open=0;
		plp_menu_2_open=0;
	}
}

function plp_load(item_id){
	// color
	$("#plp_item_"+plp_item_open+" .typo_fb").css({'color':'#4a4a4a'});
	$("#plp_item_"+item_id+" .typo_fb").css({'color':'#ffffff'});
	
	plp_item_open=item_id;
}

function plp_change_image(new_image){
	if(new_image!='preview' && new_image!='next'){plp_image_new=new_image;}

	if(new_image=='preview'){
		if(plp_image_open==1){plp_image_new=plp_nb_image;}else{plp_image_new=plp_image_open-1;}
	}

	if(new_image=='next'){
		if(plp_image_open==plp_nb_image){plp_image_new=1;}else{plp_image_new=plp_image_open; ++plp_image_new;}
	}

	// color
	$("#plp_pagination_"+plp_image_open).html('<span class="typo_ea">'+plp_image_open+'</span>');
	$("#plp_pagination_"+plp_image_new).html('<span class="typo_ec">'+plp_image_new+'</span>');
	
	// change image v2
	$.ajax({
	  url: 'includes/pages/projects/projects_data.php?action=image&id_image='+plp_image_new+'&lg='+nav_lg+'&id='+plp_item_open,
	  success: function(data) {
	  	
	  	load_image_alpha('project_image','media/'+data,'pointer_a');
	  }
	});
	
	// data
	plp_image_open=plp_image_new;
}