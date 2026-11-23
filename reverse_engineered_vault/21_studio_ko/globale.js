baseUrl = window.location.origin + '/';
//baseUrl = 'http://localhost/betterandmore/sko/';

var corpInsideWidth = 0;
let corpInsideHeight = 0;
let corpInsideML2 = 0;
let corpSidebarML2 = 0;


// ---------------- FRAME CENTER ----------------
function frameCenter() {
    let hashnavUrl = location.hash;
    hashnavUrl = hashnavUrl.replace("#", "");
    let hashnavArray = hashnavUrl.split('-');

    $('body').removeClass(function(index, className) {
        return (className.match(/\bpage-\S+/g) || []).join(' ');
    }).addClass('page-' + hashnavArray[1] + '-' + hashnavArray[2]);

    // Screen
    let screenWidth = $(window).width();
    let screenHeight = $(window).height();

    // Temporary 
    $(".bodyOver").css({ width: screenWidth + 'px', height: screenHeight + 'px' });

    // iframe
    $(".senttoaround").css({ width: screenWidth + 'px', height: screenHeight + 'px' });

    // corpIntro
    let corpIntroLeft = (screenWidth - 990) / 2;
    let corpIntroTop = (screenHeight - 768) / 2;
    $("#corpIntro").css({ marginLeft: corpIntroLeft + 'px', marginTop: corpIntroTop + 'px' });

    // corpInside
    let corpInsideWidthMin = 1103 + 20;
    let corpInsideHeightMin = 580 + 20;

    let corpInsideWidthMax = 1103 + 20;
    let corpInsideHeightMax = 580 + 20;

    //let corpInsideHeight;

    if (screenWidth > corpInsideWidthMin && screenHeight > corpInsideHeightMin) {
        // largeur
        if (corpInsideWidthMax > screenWidth) {
            corpInsideWidth = screenWidth;
        } else {
            corpInsideWidth = corpInsideWidthMax;
        }
        corpInsideHeight = corpInsideWidth * (corpInsideHeightMin / corpInsideWidthMin);

        // hauteur
        if (corpInsideHeight > screenHeight) {
            corpInsideHeight = screenHeight;
            corpInsideWidth = corpInsideHeight * (corpInsideWidthMin / corpInsideHeightMin);
        }
        corpInsideWidth = corpInsideWidth;
    } else {
        corpInsideWidth = corpInsideWidthMin+20;
        corpInsideHeight = corpInsideHeightMin;
    }

    // Size + Border
    corpInsideWidth = corpInsideWidth - 20;
    corpInsideHeight = corpInsideHeight - 20;
    $(".corpInside").css({ width: (corpInsideWidth+145) + 'px', height: corpInsideHeight + 'px' });

    // Margin (center in screen)
    let sidebarWidth = $(".corpSidebar").outerWidth() || 180;
    let corpInsideML = (((screenWidth - corpInsideWidth) / 2) + (sidebarWidth / 2))-70;
    //let corpInsideML = (screenWidth - corpInsideWidth) / 2;
    let corpInsideMR = (screenHeight - corpInsideHeight) / 2;
    $(".corpInside").css({ marginLeft: (corpInsideML-40) + 'px', marginTop: (corpInsideMR-20) + 'px' });
    corpInsideML2 = corpInsideML-40;

    // Sidebar Size + Border
    let logoHeight = 70;
    let corpSidebarHeight = corpInsideHeight;
    let corpSidebarML = (corpInsideML - 220);
        corpSidebarML2 =corpSidebarML;
    let corpSidebarMR = corpInsideMR;
    $(".corpSidebar").css({
        height: corpSidebarHeight + 'px',
        marginLeft: corpSidebarML + 'px',
        marginTop: (corpSidebarMR-20) + 'px'
    });

    // Block corpSelect
    let corpSelectMRML = ((corpInsideWidth - 50) / 2) - 10;
    let corpSelectMRMR = (corpInsideHeight - 30) / 2;
    $("#corpSelect").css({ marginLeft: corpSelectMRML + 'px', marginTop: corpSelectMRMR + 'px' });

    // Block corpComment
    let corpCommenMRt = corpInsideHeight - corpCommentHeight;
    $("#corpComment").css({ marginTop: corpCommenMRt + 'px' });

    // Block corpCommentImage
    let corpCommenImageMRt = corpInsideHeight;
    $("#corpCommentImage").css({ marginTop: corpCommenImageMRt + 'px' });

    // Block corpDiaryNavigatorA
    // let corpDiaryNavigatorAMR = (corpInsideHeight - 192) / 2;

    // Block corpDiaryNavigatorB
    let corpDiaryNavigatorBML = ((corpInsideWidth - 104) / 2);
    let corpDiaryNavigatorBMR = (corpInsideHeight - 22) / 2;
    $("#corpDiaryNavigatorB").css({
        marginLeft: corpDiaryNavigatorBML + 'px',
        marginTop: corpDiaryNavigatorBMR + 'px'
    });

    // Block corpMedia
    let corpMediaML = (corpInsideWidth - 886);
    $("#corpMedia").css({ marginLeft: corpMediaML + 'px' });

    // Block corpCredits
    let creditHeight = 21;
    let corpCreditsML = (corpInsideWidth) + 180 - 280 + 120;
    let corpCreditsMR = (corpInsideHeight) + (creditHeight) + 10;
    $("#corpCredits").css({ marginLeft: (corpCreditsML+26) + 'px', marginTop: corpCreditsMR + 'px' });

    // Console
    let consoleMarginLeft = screenWidth - 220;
    $("#console").css({ marginLeft: consoleMarginLeft + 'px' });
}

// ------------- SCALE WHOLE PAGE (BODY) -------------
function scaleFullWebsite(scale = 1) {
    let screenWidth = $(window).width();
    let screenHeight = $(window).height();
    let $body = $('body');
    let $html = $('html');

    if (scale === 1) {
        $body.css({
            transform: 'none',
            '-webkit-transform': 'none',
            '-ms-transform': 'none',
            position: 'relative',
            left: '0',
            top: '0',
            width: '100vw',   // <-- FIX
            height: '100vh',  // <-- FIX
            overflow: 'visible'
        });

        $html.css({ overflow: 'auto' });
        return;
    }


    let bodyWidth = screenWidth / scale;
    let bodyHeight = screenHeight / scale;

    let offsetX = (screenWidth - (screenWidth * scale)) / 2;
    let offsetY = (screenHeight - (screenHeight * scale)) / 2;

    $body.css({
        transform: 'scale(' + scale + ')',
        'transform-origin': 'top left',
        '-webkit-transform': 'scale(' + scale + ')',
        '-webkit-transform-origin': 'top left',
        '-ms-transform': 'scale(' + scale + ')',
        '-ms-transform-origin': 'top left',
        position: 'relative',
        left: offsetX + 'px',
        top: offsetY + 'px',
        width: bodyWidth + 'px',
        height: bodyHeight + 'px'
    });

    $html.css({ overflow: 'hidden' });
    $body.css({ overflow: 'visible' });
}

// ------------- AUTO SCALE + LAYOUT ----------------
function autoScaleWebsite() {
    let screenWidth = $(window).width();

    let scale = 1.0;
    if (screenWidth < 1475) {
        scale = screenWidth / 1475;
    } else {
        scale = 1;
    }


    console.log('Screen: ' + screenWidth + ', Scale: ' + scale);
    scaleFullWebsite(scale); // scale whole site
    frameCenter();           // then position all elements
}



/*
function frameCenter(scale = 1) {
    let hashnavUrl = location.hash;
        hashnavUrl = hashnavUrl.replace("#", "");
    let hashnavArray = hashnavUrl.split('-');

    $('body').removeClass(function(index, className) {
        return (className.match(/\bpage-\S+/g) || []).join(' ');
    }).addClass('page-' + hashnavArray[1] + '-' + hashnavArray[2]);

    // Screen
    screenWidth = $(window).width();
    screenHeight = $(window).height();

    // Temporary 
    $(".bodyOver").css({ 'width': screenWidth + 'px' });
    $(".bodyOver").css({ 'height': screenHeight + 'px' });

    // iframe
    $(".senttoaround").css({ 'width': screenWidth + 'px' });
    $(".senttoaround").css({ 'height': screenHeight + 'px' });

    // corpIntro
    corpIntroLeft = (screenWidth - 990) / 2;
    corpIntroTop = (screenHeight - 768) / 2;
    $("#corpIntro").css({ 'marginLeft': corpIntroLeft + 'px', 'marginTop': corpIntroTop + 'px' });

    // corpInside
    //# +Border
    // corpInsideWidthMin = 1077 + 20;
    // corpInsideHeightMin = 625 + 20;
    corpInsideWidthMin = 1103 + 20;
    corpInsideHeightMin = 580 + 20;

    corpInsideWidthMax = 1000 + 20;
    corpInsideHeightMax = 580 + 20;

    // corpInsideWidthMax = 1077 + 20;
    // corpInsideHeightMax = 625 + 20;
    corpInsideWidthMax = 1103 + 20;
    corpInsideHeightMax = 580 + 20;

    if (screenWidth > corpInsideWidthMin && screenHeight > corpInsideHeightMin) {
        // longeur
        if (corpInsideWidthMax > screenWidth) {
            corpInsideWidth = screenWidth;
        } else {
            corpInsideWidth = corpInsideWidthMax;
        }
        corpInsideHeight = corpInsideWidth * (corpInsideHeightMin / corpInsideWidthMin);

        // hauteur
        if (corpInsideHeight > screenHeight) {
            corpInsideHeight = screenHeight;
            corpInsideWidth = corpInsideHeight * (corpInsideWidthMin / corpInsideHeightMin);
        }

    } else {
        corpInsideWidth = corpInsideWidthMin;
        corpInsideHeight = corpInsideHeightMin;
    }

    //# Size+Border
    corpInsideWidth = corpInsideWidth - 20;
    corpInsideHeight = corpInsideHeight - 20;
    $(".corpInside").css({ 'width': corpInsideWidth + 'px', 'height': corpInsideHeight + 'px' });

    //# Margin
    corpInsideML = (screenWidth - corpInsideWidth) / 2;
    corpInsideMR = (screenHeight - corpInsideHeight) / 2;
    $(".corpInside").css({ 'marginLeft': corpInsideML + 'px', 'marginTop': corpInsideMR + 'px' });

    //# Sidebar Size+Border
    logoHeight = 70;
    // corpSidebarHeight = (corpInsideHeight + logoHeight);
    corpSidebarHeight = (corpInsideHeight);
    corpSidebarML = (corpInsideML - 180);
    // corpSidebarMR = (corpInsideMR - logoHeight) - 10;
    corpSidebarMR = corpInsideMR;
    $(".corpSidebar").css({ 'height': corpSidebarHeight + 'px', 'marginLeft': corpSidebarML + 'px', 'marginTop': corpSidebarMR + 'px' });

    // Block corpSelect
    corpSelectMRML = ((corpInsideWidth - 50) / 2) - 10;
    corpSelectMRMR = (corpInsideHeight - 30) / 2;
    $("#corpSelect").css({ 'marginLeft': corpSelectMRML + 'px', 'marginTop': corpSelectMRMR + 'px' });

    // Block corpComment
    corpCommenMRt = corpInsideHeight - corpCommentHeight;
    // $("#corpComment").css({ 'marginTop': corpCommenMRt + 'px', 'height': corpCommentHeight + 'px'  });
    $("#corpComment").css({ 'marginTop': corpCommenMRt + 'px'});

    // Block corpCommentImage
    corpCommenImageMRt = corpInsideHeight;
    $("#corpCommentImage").css({ 'marginTop': corpCommenImageMRt + 'px' });

    // Block corpDiaryNavigatorA
    corpDiaryNavigatorAMR = (corpInsideHeight - 192) / 2;
    // $("#corpDiaryNavigatorA").css({ 'marginTop': corpDiaryNavigatorAMR + 'px' });

    // Block corpDiaryNavigatorB
    // corpDiaryNavigatorBML = ((corpInsideWidth - 104) / 2) - 10;
    corpDiaryNavigatorBML = ((corpInsideWidth - 104) / 2);
    corpDiaryNavigatorBMR = (corpInsideHeight - 22) / 2;
    $("#corpDiaryNavigatorB").css({ 'marginLeft': corpDiaryNavigatorBML + 'px', 'marginTop': corpDiaryNavigatorBMR + 'px' });

    // Block corpMedia
    // corpMediaML = (corpInsideWidth - 930);
    corpMediaML = (corpInsideWidth - 886);
    $("#corpMedia").css({ 'marginLeft': corpMediaML + 'px' });

    // Block corpCredits
    creditHeight = 21;
    // corpCreditsML = (corpInsideWidth + corpInsideML) - corpSidebarML;
    corpCreditsML = (corpInsideWidth) + 180 - 280 + 120;
    // corpCreditsML = 180;
    corpCreditsMR = (corpInsideHeight) + (creditHeight) + 10;
    $("#corpCredits").css({ 'marginLeft': corpCreditsML + 'px', 'marginTop': corpCreditsMR + 'px' });

    consoleMarginLeft = screenWidth - 220;
    $("#console").css({ 'marginLeft': consoleMarginLeft + 'px' });

    // after all .corpInside sizing:
    $(".corpInside").css({
        'transform': 'scale(' + scale + ')',
        'transform-origin': 'top left',  // ensures scaling from top-left corner
        '-webkit-transform': 'scale(' + scale + ')',
        '-webkit-transform-origin': 'top left',
        '-ms-transform': 'scale(' + scale + ')',
        '-ms-transform-origin': 'top left'
    });

    // Adjust margins so that it stays centered after scaling
    let scaledWidth = corpInsideWidth * scale;
    let scaledHeight = corpInsideHeight * scale;
    let marginLeft = (screenWidth - scaledWidth) / 2;
    let marginTop = (screenHeight - scaledHeight) / 2;
    $(".corpInside").css({ 'marginLeft': marginLeft + 'px', 'marginTop': marginTop + 'px' });
}

// autoScaleWebsite - Automatically scale and center the website based on screen size 
// function autoScaleWebsite() {
//     let screenWidth = $(window).width();
//     let screenHeight = $(window).height();
    
//     let referenceWidth = 1920;
//     let referenceHeight = 1080;
    
//     let scaleWidth = screenWidth / referenceWidth;
//     let scaleHeight = screenHeight / referenceHeight;
    
//     let scale = Math.min(scaleWidth, scaleHeight);
    
//     let minScale = 0.6;  // Don't scale below 60%
//     let maxScale = 1.0;  // Don't scale above 100% to prevent enlargement issues
    
//     scale = Math.max(minScale, Math.min(maxScale, scale));

//     // Apply the calculated scale
//     scaleFullWebsite(scale);
    
//     // Log for debugging (can be removed in production)
//     console.log('Screen: ' + screenWidth + 'x' + screenHeight + ', Scale: ' + scale.toFixed(2));
// }


function scaleFullWebsite(scale = 1) {
    let screenWidth = $(window).width();
    let screenHeight = $(window).height();
    let $body = $('body');
    let $html = $('html');
    
    if (scale === 1) {
        $body.css({
            'transform': 'none',
            '-webkit-transform': 'none',
            '-ms-transform': 'none',
            'position': 'relative',
            'left': '0',
            'top': '0'
        });
        $html.css({
            'overflow': 'auto'
        });
        return;
    }
    
    let bodyWidth = screenWidth / scale;
    let bodyHeight = screenHeight / scale;
    
    let offsetX = (screenWidth - (screenWidth * scale)) / 2;
    let offsetY = (screenHeight - (screenHeight * scale)) / 2;
    
    $body.css({
        'transform': 'scale(' + scale + ')',
        'transform-origin': 'top left',
        '-webkit-transform': 'scale(' + scale + ')',
        '-webkit-transform-origin': 'top left',
        '-ms-transform': 'scale(' + scale + ')',
        '-ms-transform-origin': 'top left',
        'position': 'relative',
        'left': offsetX + 'px',
        'top': offsetY + 'px',
        'width': bodyWidth + 'px',
        'height': bodyHeight + 'px'
    });
    
    $html.css({
        'overflow': 'hidden'
    });
    
    $body.css({
        'overflow': 'visible'
    });
}

function autoScaleWebsite() {
    let screenWidth = $(window).width();
    let screenHeight = $(window).height();
    
    let scale = 1.0;
    
    if (screenWidth < 1475){
        
        scale=1/1475*screenWidth;
        
    }else{
        scale=1;
    }
    
    
    console.log('Screen: ' + screenWidth + ', Scale: '+ scale);
    scaleFullWebsite(scale);
    frameCenter(scale);
}
*/

// actionCorpIntro
function actionCorpIntro(direction) {
    if (direction == 'open') {
        $("#corpIntro").css({ 'display': 'block', 'opacity': '0' });

        $("#corpIntro").load(baseUrl+"ajax/intro.php", function() {
            $("#corpIntro").animate({ opacity: 1 }, 500);
        });
    }

    if (direction == 'close') {
        $("#corpIntro").animate({ opacity: 0 }, 500, function() {
            $("#corpIntro").html('');
            $("#corpIntro").css({ 'display': 'none' });
        });
    }
}

// actionCorpMenu
// Direction = open / close 
function actionCorpMenu(direction) {
    if (direction == 'open') {
        $("#corpMenu").css({ 'display': 'block', 'opacity': '0' });
        $("#corpMenu").load(baseUrl+"ajax/corpmenu.php?thm=open&lg=" + bodyLg, function() {
            $("#corpMenu").animate({ opacity: 1 }, 500);
        });
    }
    if (direction == 'close') {
        $("#corpMenu").animate({ opacity: 0 }, 500, function() {
            $("#corpMenu").css({ 'display': 'none' });
        });

    }
}

// actionCorpSelect
// Direction = open / close 
function actionCorpSelect(direction) {
    if (direction == 'open') {
        $("#corpSelect").css({ 'display': 'block', 'opacity': '0' });
        $("#corpSelect").load(baseUrl+"ajax/corpselect.php", function() {
            $("#corpSelect").animate({ opacity: 1 }, 500);
        });
    }
    if (direction == 'close') {
        $("#corpSelect").animate({ opacity: 0 }, 500, function() {
            $("#corpSelect").css({ 'display': 'none' });
        });

    }
}

// actionCorpCredits
// Direction = open / close 
function actionCorpCredits(direction) {
    if (direction == 'open') {
        $("#corpCredits").load(baseUrl+"ajax/credits.php?thm=open&lg=" + bodyLg, function() {
            $("#corpCredits").animate({ opacity: 1 }, 500);
            if (flash) {
                $(".creditsFlash .creditsFlashOn").addClass("on");
            } else {
                $(".creditsFlash .creditsFlashOn").removeClass("on");
            }
        });
    }
    if (direction == 'close') {
        $("#corpCredits").animate({ opacity: 0 }, 500);
    }
}

function actionhashnavCorpCreditsCorp(direction) {
    if (direction == 'open') {
        $("#corpCreditsCorp").load(baseUrl+"ajax/credits.php?thm=corp&lg=" + bodyLg, function() {
            $("#corpCreditsCorp").animate({ opacity: 1 }, 500);
            if (flash) {
                $(".creditsFlash .creditsFlashOn").addClass("on");
            } else {
                $(".creditsFlash .creditsFlashOn").removeClass("on");
            }
        });
    }
    if (direction == 'close') {
        $("#corpCreditsCorp").animate({ opacity: 0 }, 500, function() {
            $("#corpCreditsCorp").html('');
        });
    }
}

// actionCorpDiaryNavigatorA
// Direction = open / close 
function actionCorpDiaryNavigatorA(direction, id_diary) {
    id_diary = id_diary || "";

    if (direction == 'open') {
        $("#corpDiaryNavigatorA").css({ 'display': 'block' });
        $("#corpDiaryNavigatorA").load(baseUrl+"ajax/diary.php?thm=corpdiarynavigatora&sthm=open&id_diary=" + id_diary + "&lg=" + bodyLg, function() {
            $("#corpDiaryNavigatorA").animate({ opacity: 1 }, 500);
        });
    }
    if (direction == 'close') {
        $("#corpDiaryNavigatorA").animate({ opacity: 0 }, 500, function() {
            $("#corpDiaryNavigatorA").css({ 'display': 'none' });
        });

    }
}

function actionCorpDiaryNavigatorAChange(direction) {

    // Recuperation de la position
    $.get(baseUrl+"ajax/diary.php?thm=positionitem&id_diary=" + direction + "&lg=" + bodyLg, function(data) {

        // slide vers la position
        marginLeft = (data - 1) * 32;
        $("#cdnaInner").stop();
        $("#cdnaInner").animate({ 'marginLeft': marginLeft + 'px' }, 500);

        ii = data - 15;
        for (i = 1; i <= 30; i++) {
            creatThumb = 'no';
            ii++;
            if (ii >= 1) {

                if (i > 10 && i < 20) { // si existe pas, on cr?


                    creatThumb = 'no';

                    if (typeof navigatorAtable[ii] != 'undefined') {
                        if (navigatorAtable[ii] == 'open') {
                            // exist
                        } else {
                            // ? cre?
                            creatThumb = 'yes';
                        }
                    } else {
                        // ? cre?
                        creatThumb = 'yes';
                    }

                    if (creatThumb == 'yes') {

                        tMarginLeft = ii * 32;

                        tPos = Math.floor(Math.random() * 6);
                        tPos++;
                        $("#cdnaInner").append('<div class="cdnaItem pos' + tPos + '" id="cdnaItem' + ii + '" style="margin-left:-' + tMarginLeft + 'px"></div>');
                        navigatorAtable[ii] = 'open';

                        $("#cdnaInner #cdnaItem" + ii).load(baseUrl+"ajax/diary.php?thm=imgthumb&position=" + ii + "&lg=" + bodyLg, function() {
                            //$("#corpDiaryNavigatorA").animate({opacity: 1}, 500);
                        });

                    }

                } else {
                    // si existe on supprime
                    $("#cdnaItem" + ii).remove();
                    navigatorAtable[ii] = 'close';
                }
            }
        }
    });

    // affichage de la position

    // affichage position +5
    // affichage position -5
    // suppression pour optimisation
    // **
}

// actionCorpDiaryNavigatorB
// Direction = open / close 
//actionCorpDiaryNavigatorBAction=0;
actionCorpDiaryNavigatorBActu = 0;

function actionCorpDiaryNavigatorB(direction, id_diary) {
    id_diary = id_diary || "";

    if (direction == 'open') {
        // Delete Actu
        $("#corpDiaryNavigatorB" + actionCorpDiaryNavigatorBActu).stop();
        $("#corpDiaryNavigatorB" + actionCorpDiaryNavigatorBActu).animate({ opacity: '0' }, 500, function() {
            $(this).remove();
        });
        // Creat New
        actionCorpDiaryNavigatorBActu++;
        $("#corpDiaryNavigatorB").append('<div id="corpDiaryNavigatorB' + actionCorpDiaryNavigatorBActu + '" class="corpDiaryNavigatorBInner opacity0"> jaouad </div>');

        $("#corpDiaryNavigatorB" + actionCorpDiaryNavigatorBActu).load(baseUrl+"ajax/diary.php?thm=corpdiarynavigatorb&id_diary=" + id_diary + "&navigatorBActu=" + actionCorpDiaryNavigatorBActu + "&lg=" + bodyLg, function() {
            $(this).animate({ opacity: 1 }, 500);
        });
    }

    if (direction == 'close') {
        $("#corpDiaryNavigatorB" + actionCorpDiaryNavigatorBActu).stop();
        $("#corpDiaryNavigatorB" + actionCorpDiaryNavigatorBActu).animate({ opacity: '0' }, 500, function() {
            $(this).remove();
        });
    }
}

function actionCorpDiaryNavigatorBChange(direction) {
    /*
    $("#corpDiaryNavigatorB").animate({opacity: 0}, 500,function(){
        $( "#corpDiaryNavigatorB" ).load( baseUrl+"ajax/diary.php?thm=corpdiarynavigatorb&sthm=open&id_diary="+direction+"&lg="+bodyLg, function() {
            $("#corpDiaryNavigatorB").animate({opacity: 1}, 500);
        });
    });
    */
}

// actionCorpComment
// Direction = 1 / 2 / 3
corpCommentActu = 1;
corpCommentHeight = 400;
function actionCorpComment(thm, direction) {

    // hide corpCommentInner
    $("#corpCommentInner" + corpCommentActu).animate({ 'opacity':'0', 'marginTop': corpCommentHeight + 'px' }, 300);
    corpCommentActu++;

    $("#corpComment").append("<div id=\"corpCommentInner" + corpCommentActu + "\" class=\"corpCommentInner\" style=\"margin-top:" + corpCommentHeight + "px;\"></div>");
    $("#corpCommentInner" + corpCommentActu).delay(500).load(baseUrl+"ajax/comments.php?thm=" + thm + "&direction=" + direction + "&lg=" + bodyLg, function() {
        heightComment = $("#corpCommentInner" + corpCommentActu).height();
        heightComment = corpCommentHeight - heightComment;

        $("#corpCommentInner" + corpCommentActu).animate({ 'marginTop': heightComment + 'px' }, 300);
    });
}

function actionCorpCommentClose(direction) {
    if (direction == 'close') {
        $("#corpCommentInner" + corpCommentActu).animate({ 'opacity':'0', 'marginTop': corpCommentHeight + 'px' }, 300);
        corpCommentActu++;
    }
}

corpPaginationActu = 1;
corpPaginationHeight = 121;

corpPaginationScrollHeight = 0;
function actionCorpPagination(thm, direction) {
    // hide corpMediaNavInner
    $("#corpMediaNavInner" + corpPaginationActu).animate({ 'opacity':'0', 'marginTop': corpPaginationHeight + 'px' }, 300, function () {
        $(this).removeClass('hidden');
    });
    corpPaginationActu++;

    $("#corpMedia").append("<div id=\"corpMediaNavInner" + corpPaginationActu + "\" class=\"corpMediaNavInner\" style=\"opacity:1; margin-top:" + corpPaginationHeight + "px;\"></div>");

    $("#corpMediaNavInner" + corpPaginationActu).delay(500).load(baseUrl+"ajax/medias_nav.php?thm=" + thm + "&direction=" + direction + "&lg=" + bodyLg, function() {
        heightPagination = $("#corpMediaNavInner" + corpPaginationActu).height();
        heightPagination = corpPaginationHeight - heightPagination;
        $("#corpMediaNavInner" + corpPaginationActu).animate({ 'marginTop': heightPagination + 'px' }, 300);
    });
}

function actionCorpPaginationClose(direction) {
    if (direction == 'close') {
        $("#corpMediaNavInner" + corpPaginationActu).animate({ 'opacity':'0', 'marginTop': corpPaginationHeight + 'px' }, 300, function () {
            $(this).addClass('hidden');
        });
        corpPaginationActu++;
    }
}

//actionCorpMedia
// Direction = 1 / 2 / 3
//actionCorpMediaAction=0;
var actionCorpMediaFullActu;
actionCorpMediaFullActu = 0;
actionCorpMediaFullNavNow = 0;
mediaPaginationMax = 0;

function actionCorpMediaFull(direction, thm, limit) {
    if (direction == 'close') {
        actionCorpMediaFullClose();
    } else {
        actionCorpPaginationClose('close');
        actionCorpMediaClose('close');
        actionCorpMediaListClose('close');
        actionCorpChessListClose('close');

        // Delete Actu
        actionCorpMediaFullActuDelete = actionCorpMediaFullActu;

        $("#corpMediaFullInner" + actionCorpMediaFullActuDelete).stop();
        $("#corpMediaFullInner" + actionCorpMediaFullActuDelete).animate({ opacity: '0' }, 200, function() {
            $("#corpMediaFullInner" + actionCorpMediaFullActuDelete).remove();
        });

        // Creat New
        var actionCorpMediaFullActuNew;
        actionCorpMediaFullActu++;
        actionCorpMediaFullActuNew = actionCorpMediaFullActu;

        $("#corpMediaFull").append("<div id=\"corpMediaFullInner" + actionCorpMediaFullActuNew + "\" style=\"z-index:" + actionCorpMediaFullActuNew + "\" class=\"corpMediaInner opacity0 cursorPointer\" ></div>");

        actionCorpComment('', '');

        $("#corpMediaFullInner" + actionCorpMediaFullActuNew).load(baseUrl+"ajax/medias.php?thm=" + thm + "&direction=" + direction + "&limit=" + limit + "&lg=" + bodyLg, function() {
            if (actionCorpMediaFullActuNew == actionCorpMediaFullActu) {
                $("#corpMediaFullInner" + actionCorpMediaFullActuNew).animate({ opacity: 1 }, 200);
            }
        });
    }
}

function actionCorpMediaFullClose(direction) {
    actionCorpMediaFullActuDelete = actionCorpMediaFullActu;
    $("#corpMediaLoad").stop();
    $("#corpMediaLoad").animate({ opacity: 0 }, 200);

    $("#corpMediaFullInner" + actionCorpMediaFullActuDelete).animate({ opacity: '0' }, 200, function() {
        $(this).remove();
    });
}

//actionCorpMedia
// Direction = 1 / 2 / 3
//actionCorpMediaAction=0;
var actionCorpMediaActu;
actionCorpMediaActu = 0;
actionCorpMediaNavNow = 0;
mediaPaginationMax = 0;

function actionCorpMedia(direction, thm, limit) {
    if (direction == 'close') {
        actionCorpMediaClose();
    } else {
        actionCorpMediaListClose('close');
        actionCorpChessListClose('close');
        actionCorpMediaFullClose('close');

        // Delete Actu
        actionCorpMediaActuDelete = actionCorpMediaActu;

        $("#corpMediaInner" + actionCorpMediaActuDelete).stop();
        $("#corpMediaInner" + actionCorpMediaActuDelete).animate({ opacity: '0' }, 200, function() {
            $("#corpMediaInner" + actionCorpMediaActuDelete).remove();
        });

        // Creat New
        var actionCorpMediaActuNew;
        actionCorpMediaActu++;
        actionCorpMediaActuNew = actionCorpMediaActu;
        var imgProtection = '';

        $("#corpMedia").append("<div id=\"corpMediaInner" + actionCorpMediaActuNew + "\" style=\"z-index:" + actionCorpMediaActuNew + "\" class=\"corpMediaInner opacity0 cursorPointer\" ></div>");

        if (thm == 'parcours' || thm == 'karlolivier' || thm == 'recrutement' || thm == 'contactpm' || thm == 'koll') {
            if (thm == 'karlolivier') {
                actionCorpComment('', '');
            }

            $("#corpMediaInner" + actionCorpMediaActuNew).load(baseUrl+"ajax/medias.php?thm=" + thm + "&direction=" + direction + "&limit=" + limit + "&lg=" + bodyLg, function() {
                if (actionCorpMediaActuNew == actionCorpMediaActu) {
                    $("#corpMediaInner" + actionCorpMediaActuNew).animate({ opacity: 1 }, 300);
                }
            });
        } else {
            if (thm == 'diary') {
                actionClick = 'onclick="actionCorpMediaMove(\'left\'); return false;"';
            } else {
                actionClick = 'onclick="actionCorpMediaMove(\'right\'); return false;"';
            }

            if (thm == 'project') {
                var parentId = getFolderKeyByCateId(direction);
                if (parentId == 14 || parentId == 6) {
                    imgProtection = 'draggable="false" oncontextmenu="return false;"';
                }
            }

            //onclick="actionCorpMediaMove(\'right\'); return false;"

            // Load
            // $("#corpMediaLoad").stop();
            // $("#corpMediaLoad").css({ 'width': '1px' });
            // $("#corpMediaLoad").animate({ 'opacity': '1' }, 200);
            // $("#corpMediaLoad").animate({ 'width': '300px' }, 7000);

            $("#corpMediaLoad").stop(true, true)
            .css({ width: "1px", opacity: 0 })
            .delay(50)
            .animate({ opacity: 1 }, 200) // fade in first
            .animate({ width: "300px" }, 7000); // then expand

            $.get(baseUrl+"ajax/medias.php?thm=" + thm + "&direction=" + direction + "&limit=" + limit + "&lg=" + bodyLg, function(data) {
                // console.log(baseUrl+"ajax/medias.php?thm=" + thm + "&direction=" + direction + "&limit=" + limit + "&lg=" + bodyLg);

                listData = data;
                data = data.split(";");

                // Check for double pictures mode
                var doublePicture = (($.trim(data[0])) === 'double_pictures');
                
                var dataA, dataB, dataC, dataD;
                if (doublePicture) {
                    dataA = data[1]; // First image URL
                    dataB = data[2]; // First image width
                    dataC = data[3]; // Second image URL
                    dataD = data[4]; // Second image width
                } else {
                    dataA = data[0]; // Image URL
                    dataB = data[1]; // Image width
                    dataC = data[2];
                    dataD = data[3];
                }

                if (dataA == '') {
                    return false;
                }

                // Check for empty images
                var image1Empty = (doublePicture && (!dataA || dataA === ''));
                var image2Empty = (doublePicture && (!dataC || dataC === ''));

                // move corpDiaryNavigatorB
                corpDiaryNavigatorB_margin_left = 369;
                if (dataB >= 386) {
                    marginLeftRemove = dataB - 386;
                    corpDiaryNavigatorB_margin_left = 369 - marginLeftRemove;
                }

                // $("#corpDiaryNavigatorB").stop().animate({ "margin-left": corpDiaryNavigatorB_margin_left + "px" }, 300);

                corpCommentHeight = 400;
                if (dataB >= 564) {
                    // corpCommentHeight = 220;
                } 
                if (dataB >= 680) {
                    // corpCommentHeight = 240;
                }

                // Block corpComment
                corpCommentWidth = corpInsideWidth - dataB - 10;
                var height = $(".corpCommentInner").last().height();
               // var corpInsideHeight = $(".corpInside").height();
                corpCommentMT = corpInsideHeight - corpCommentHeight;
                // corpCommentMT = corpInsideHeight - height;
                if (dataB > 886) {
                    corpCommentWidth = corpInsideWidth - 886 - 10;
                }

                // $("#corpComment").animate({ 'width': corpCommentWidth + 'px', 'margin-top': corpCommentMT + 'px', 'height': corpCommentHeight + 'px' }, 600);
                $("#corpComment").css({ 'margin-top': corpCommentMT + 'px' });

                var dataExtention = '';
                if (dataA) {
                    dataExtention = dataA.split('.').pop();
                }

                if (dataExtention == 'flv') {
                    urlVideo = 'https%3A//www.studioko.fr/' + dataA;
                    urlWidth = 380;
                    urlHeight = 500;
                    $("#corpMediaInner" + actionCorpMediaActuNew).html('<div><object type="application/x-shockwave-flash" data="http://flv-player.net/medias/player_flv_multi.swf" bgcolor="#000000" width="' + urlWidth + '" height="' + urlHeight + '"><param name="movie" value="http://flv-player.net/medias/player_flv_multi.swf" /><param name="allowFullScreen" value="true" /><param name="FlashVars" value="flv=' + urlVideo + '&currentflvcolor=000000;&sliderovercolor=transparent;&slidercolor1=transparent&slidercolor2=transparent&buttonovercolor=ff9a0a;&buttoncolor=ff9a0a;&loadingcolor=000000;&playercolor=000000;&buffermessage=&showopen=0&buffer=0&width=' + urlWidth + '&height=' + urlHeight + '&autoplay=1&autoload=1&margin=0&showplayer=always" /></object></div>');

                    if (actionCorpMediaActuNew == actionCorpMediaActu) {
                        $("#corpMediaInner" + actionCorpMediaActuNew).animate({ opacity: 1 }, 200);
                        $("#corpMediaLoad").stop();
                        $("#corpMediaLoad").stop();
                        $("#corpMediaLoad").animate({ opacity: 0 }, 300);
                    } else {
                        $("#corpMediaInner" + actionCorpMediaActuNew).remove();
                        $("#corpMediaLoad").stop();
                        $("#corpMediaLoad").stop();
                        $("#corpMediaLoad").animate({ opacity: 0 }, 300);
                    }
                } else {
                    var imagesLoaded = 0;
                    var totalImagesToLoad = 0;
                    var imagesToLoad = [];

                    if (!image1Empty) {
                        imagesToLoad.push({ url: dataA, width: dataB });
                        totalImagesToLoad++;
                    }
                    if (doublePicture && !image2Empty) {
                        imagesToLoad.push({ url: dataC, width: dataD });
                        totalImagesToLoad++;
                    }
                    
                    function checkAllImagesLoaded() {
                        imagesLoaded++;
                        if (imagesLoaded >= totalImagesToLoad) {
                            if (actionCorpMediaActuNew == actionCorpMediaActu) {
                                $("#corpMediaInner" + actionCorpMediaActuNew).animate({ opacity: 1 }, 400);
                                $("#corpMediaLoad").stop().animate({ opacity: 0 }, 400);
                            } else {
                                $("#corpMediaInner" + actionCorpMediaActuNew).remove();
                                $("#corpMediaLoad").stop().animate({ opacity: 0 }, 400);
                            }
                        }
                    }

                    // Load first image if not empty
                    if (!image1Empty) {
                        $.get(dataA, function(data2) {
                            var firstImageHTML = '';
                            if (thm == 'project' || thm == 'edition' || thm == 'presse' || thm == 'monographie' || thm == 'agence') {
                                // firstImageHTML = '<img ' + actionClick + ' src="' + dataA + '" width="' + dataB + '">';
                                firstImageHTML = '<img ' + actionClick + ' src="' + dataA + '" ' + imgProtection + '>';
                                $("#corpMediaInner" + actionCorpMediaActuNew).addClass('project-media');
                            } else {
                                firstImageHTML = '<table width="100%" height="' + corpInsideHeight + '"><tr valign="center"><td style="vertical-align: bottom;"><img ' + actionClick + ' src="' + dataA + '"></td></tr></table>';
                            }

                            if (doublePicture) {
                                // Create container for both images
                                $("#corpMediaInner" + actionCorpMediaActuNew).html('<div class="double-image-container">' + firstImageHTML + '</div>');
                            } else {
                                $("#corpMediaInner" + actionCorpMediaActuNew).html(firstImageHTML);
                            }

                            // Load second image if in double picture mode
                            if (doublePicture && !image2Empty) {
                                $.get(dataC, function(data3) {
                                    var secondImageHTML = secondImageHTML = '<img ' + actionClick + ' src="' + dataC + '" ' + imgProtection + '>';

                                    $("#corpMediaInner" + actionCorpMediaActuNew).find(".double-image-container").append(secondImageHTML);
                                    checkAllImagesLoaded();
                                });
                            }

                            checkAllImagesLoaded();

                            if(thm == 'collaborateur') {
                                setTimeout(function() {
                                    $(".corpInsideImage").css("z-index","99");
                                }, 100);
                            }
                        });
                    }
                }

                flashMediaMouseOverSettle();
            });
        }

        // # New Update [ Comment Image ]
        if (thm == 'project' && direction != 'close') {
            $.get(baseUrl+"ajax/mediascomment.php?thm=" + thm + "&direction=" + direction + "&limit=" + limit + "&lg=" + bodyLg, function(dataA) {
                $("#corpCommentImageInner").stop().animate({ 'opacity': 0 }, 350, function() {
                    $("#corpCommentImageInner span").html(dataA);
                    $("#corpCommentImageInner").stop().animate({ 'opacity': 1 }, 350);
                });
            });
        }
    }
}

function actionCorpMediaClose(direction) {
    actionCorpMediaActuDelete = actionCorpMediaActu;
    $("#corpMediaLoad").stop();
    $("#corpMediaLoad").animate({ opacity: 0 }, 200);

    $("#corpMediaInner" + actionCorpMediaActuDelete).animate({ opacity: '0' }, 500, function() {
        $(this).remove();
    });
}

//actionCorpMediaList
let actionCorpMediaListActu = 0;
function actionCorpMediaList(direction, thm, limit) {
    if (direction === 'close') {
        actionCorpMediaListClose();
    } else {
        actionCorpMediaClose('close');
        let actionCorpMediaListActuDelete = actionCorpMediaListActu;
        let oldDiv = $("#corpMediaListInner" + actionCorpMediaListActuDelete);

        // Delete Media Inner
        $(".corpMediaInner").stop();
        $(".corpMediaInner").animate({ opacity: '0' }, 200, function() {
            $(".corpMediaInner").remove();
        });

        // Load
        $("#corpMediaLoad").stop();
        $("#corpMediaLoad").css({ 'width': '1px' });
        $("#corpMediaLoad").animate({ 'opacity': 1 }, 200);
        $("#corpMediaLoad").animate({ 'width': '300px' }, 7000);

        // Function to add the new div
        function addNewDiv() {
            actionCorpMediaListActu++;
            let actionCorpMediaListActuNew = actionCorpMediaListActu;

            // Append new div with opacity 0
            $("#corpMedia").append("<div id=\"corpMediaListInner" + actionCorpMediaListActuNew + "\" style=\"z-index:" + actionCorpMediaListActuNew + "; opacity: 0;\" class=\"corpMediaListInner opacity0 cursorPointer\" ></div>");

            // Load content via AJAX
            $.get(baseUrl + "ajax/medias.php?thm=" + thm + "&direction=" + direction + "&subdirection=" + limit + "&lg=" + bodyLg, function(data) {
                let newDiv = $("#corpMediaListInner" + actionCorpMediaListActuNew);
                newDiv.addClass('media-list');
                newDiv.html(data);

                let images = newDiv.find('img');
                let loaded = 0;
                let errored = 0;
                let total = images.length;

                if (total === 0) {
                    // No images found, proceed immediately
                    handleComplete();
                    return;
                }

                images.each(function() {
                    let img = new Image();
                    img.src = $(this).attr('src');

                    img.onload = function() {
                        loaded++;
                        checkCompletion();
                    };
                    
                    img.onerror = function() {
                        errored++;
                        $(this).remove(); // Remove the broken image from DOM
                        checkCompletion();
                    };
                });

                function checkCompletion() {
                    if (loaded + errored === total) {
                        handleComplete();
                    }
                }

                function handleComplete() {
                    // Fade in new div after content is processed
                    if (actionCorpMediaListActuNew === actionCorpMediaListActu) {
                        newDiv.animate({ opacity: 1 }, 200, function() {
                            // Stop loading animation only after the new div is fully shown
                            $("#corpMediaLoad").stop();
                            $("#corpMediaLoad").animate({ opacity: 0 }, 200);
                        });
                    } else {
                        newDiv.remove();
                        $("#corpMediaLoad").stop();
                        $("#corpMediaLoad").animate({ opacity: 0 }, 200);
                    }

                    setTimeout(function() {
                        $("#media_list").mCustomScrollbar('update');
                    }, 100);

                    // $("#media_list").mCustomScrollbar('update');
                    flashMediaMouseOverSettle();
                    
                    // Run initially
                    checkOverlaps();
                }

                flashMediaMouseOverSettle();
            });
        }

        // If the old div exists, fade out first, then add a new one
        if (oldDiv.length) {
            oldDiv.stop();
            oldDiv.animate({ opacity: 0 }, 200, function() {
                $(this).remove();
                addNewDiv(); // Call function after removal
            });
        } else {
            addNewDiv(); // Directly add a new div if no old div exists
        }
    }
}


function actionCorpMediaListClose(direction) {
    actionCorpMediaListActuDelete = actionCorpMediaListActu;
    $("#corpMediaLoad").stop();
    $("#corpMediaLoad").animate({ opacity: 0 }, 200);

    $("#corpMediaListInner" + actionCorpMediaListActuDelete).animate({ opacity: '0' }, 500, function() {
        $(this).remove();
    });
}

function actionCorpMediaMove(direction) {
    
    if (direction == 'left') {
        mediaPaginationActuNew = mediaPaginationActu;
        mediaPaginationActuNew--;
    } else {
        mediaPaginationActuNew = mediaPaginationActu;
        mediaPaginationActuNew++;
    }
    // console.log('direction:- ' + direction);
    // console.log('mediaPaginationActuNew:- ' + mediaPaginationActuNew);
    // console.log('hashnavArray[1]:- ' + hashnavArray[1]);

    if (mediaPaginationActuNew == 0) { mediaPaginationActuNew = mediaPaginationMax; }
    if (mediaPaginationActuNew > mediaPaginationMax) { mediaPaginationActuNew = 1 }

    hashnavUrl = location.hash;
    hashnavUrl = hashnavUrl.replace("#", "");
    var hashnavArray = hashnavUrl.split('-');

    if (hashnavArray[1] == 'project') {
        newHash = hashnavArray[0] + '-' + hashnavArray[1] + '-' + hashnavArray[2] + '-' + mediaPaginationActuNew;
        window.location.hash = newHash;
    }

    if (hashnavArray[1] == 'agence' || hashnavArray[1] == 'parution') {
        newHash = hashnavArray[0] + '-' + hashnavArray[1] + '-' + hashnavArray[2] + '-' + hashnavArray[3] + '-' + mediaPaginationActuNew;
        window.location.hash = newHash;
    }

    if (hashnavArray[1] == 'diary' && hashnavArray[2] != 'home') {
        if (direction == 'left') {
            openLink = $(".linkNBL" + actionCorpDiaryNavigatorBActu + " a").attr('href');
        } else {
            openLink = $(".linkNBR" + actionCorpDiaryNavigatorBActu + " a").attr('href');
        }
        openLink = openLink.replace(/\//g, '-');

        if (typeof openLink != 'undefined') {
            window.location.hash = openLink;
        }
        //newHash=hashnavArray[0]+'-'+hashnavArray[1]+'-'+hashnavArray[2]+'-'+hashnavArray[3]+'-'+mediaPaginationActuNew;
        //window.location.hash = newHash;
    }
    mediaPaginationActu = mediaPaginationActuNew;
}

function actionCorpMediaNavColor(direction) {
    let hashnavUrl = location.hash;
        hashnavUrl = hashnavUrl.replace("#", "");

    let hashnavArray = hashnavUrl.split('-');

    if (hashnavArray[1] == 'project' || hashnavArray[1] == 'parution' || hashnavArray[1] == 'agence') {
        $("#a" + actionCorpMediaNavNow + '.project-nav').removeClass('active-nav');
        $("#a" + direction + '.project-nav').addClass('active-nav');
    }

    // $("#a" + actionCorpMediaNavNow + " span").removeClass('tSpeA');
    // $("#a" + actionCorpMediaNavNow + " span").addClass('tColorA');
    // $("#a" + direction + " span").removeClass('tColorA');
    // $("#a" + direction + " span").addClass('tSpeA');

    actionCorpMediaNavNow = direction;
    mediaPaginationActu = direction;
    //alert(direction);
}

//actionCorpNavigator
// Direction = 1 / 2 / 3
// width, height, left, top
actionCorpNavigatorActu = 0;

function actionCorpNavigator(direction, dleft, dtop, mediaDirection) {

    let hashnavUrl = location.hash;
        hashnavUrl = hashnavUrl.replace("#", "");
    let hashnavArray = hashnavUrl.split('-');
    let menu = '';
    let submenu = '';

    if (hashnavArray[1] == "parution") {
        menu = hashnavArray[2];
    }

    if (hashnavArray[1] == "project") {
        submenu = hashnavArray[2] != 'home' ? hashnavArray[2] : '';
    }

    if (hashnavArray[1] == "projectlist") {
        menu = hashnavArray[2];
    }

    if (hashnavArray[1] == "agence") {
        if (hashnavArray[2] == "agence") {
            menu = hashnavArray[3];
        } else {
            menu = hashnavArray[2];
        }
    }

    TactionCorpNavigatorActu = actionCorpNavigatorActu;

    $("#corpNavigatorInner" + TactionCorpNavigatorActu).animate({ opacity: 0 }, 500, function() {
        $(this).html('');

        $("#corpNavigator").append("<div id=\"corpNavigatorInner" + direction + "\" class=\"corpNavigatorInner opacity0\" ></div>");
        $("#corpNavigatorInner" + direction).load(baseUrl+"ajax/navigator.php?thm=navigator&id_navigator=" + direction + "&lg=" + bodyLg + "&menu=" + menu + '&submenu=' + submenu, function() {
            $("#corpNavigatorInner" + direction).animate({ opacity: 1 }, 500);
            actionCorpNavigatorActu = direction;
        });
    });

    $("#corpMediaScrollNavInner")
    .load(baseUrl+"ajax/medias_nav.php?load=1&type=scroll&lg=" + bodyLg, function() {

    });
}

function actionCorpNavigatorClose(direction) {
    if (direction == 'close') {
        $("#corpNavigatorInner" + actionCorpNavigatorActu).animate({ opacity: 0 }, 500, function() {
            $(this).html('');
        });
    }
}

//actionCorpChess
// Direction = 1 / 2 / 3
// width, height, left, top
actionCorpChessActu = 0;
function actionCorpChess(direction, dleft, dtop) {
    TactionCorpChessActu = actionCorpChessActu;

    $("#corpChessInner" + TactionCorpChessActu).animate({ opacity: 0 }, 500, function() {
        $("#corpChessInner" + TactionCorpChessActu).remove();
    });

    $("#corpChess").append("<div id=\"corpChessInner" + direction + "\" class=\"corpChessInner\" style=\"opacity:0;\"></div>");
    $("#corpChessInner" + direction).load(baseUrl+"ajax/chess.php?thm=" + direction + "&lg=" + bodyLg, function() {

        $("#corpChessInner" + direction).animate({ opacity: 1 }, 500);
        actionCorpChessActu = direction;

        var chessMl = corpInsideML2 - corpSidebarML2;
        $("#corpChessInner" + direction).css({'marginLeft': chessMl + 'px'});

        setTimeout(function() {
            $(".corpInsideImage").css("z-index","99");
        }, 600);
    });
}

function actionCorpChessMove(chessNb, direction) {
    if (direction != 'home') {
        // Recuperation de la position
        $.get(baseUrl+"ajax/chess.php?thm=position" + chessNb + "ml&sthm=" + direction, function(data) {
            $("#corpChessArrayInner").stop().animate({ marginLeft: data }, 500);
        });
    }
}

function actionCorpChessClose(direction) {
    if (direction == 'close') {
        $("#corpChessInner" + actionCorpChessActu).animate({ opacity: 0 }, 500, function() {
            $("#corpChessInner" + actionCorpChessActu).remove();
        });

    }
}

//actionCorpChessList
let actionCorpChessListActu = 0;
function actionCorpChessList(direction, thm, project) {
    if (direction === 'close') {
        actionCorpChessListClose();
    } else {
        actionCorpMediaClose('close');
        let actionCorpChessListActuDelete = actionCorpChessListActu;
        let oldDiv = $("#corpChessListInner" + actionCorpChessListActuDelete);

        // Delete Media Inner
        $(".corpMediaInner").stop();
        $(".corpMediaInner").animate({ opacity: '0' }, 200, function() {
            $(".corpMediaInner").remove();
        });

        // Load
        $("#corpMediaLoad").stop();
        $("#corpMediaLoad").css({ 'width': '1px' });
        $("#corpMediaLoad").css({ 'opacity': '1' });
        $("#corpMediaLoad").animate({ 'opacity': 1 }, 200);
        $("#corpMediaLoad").animate({ 'width': '300px' }, 7000);

        // Function to add the new div
        function addNewDiv() {
            actionCorpChessListActu++;
            let actionCorpChessListActuNew = actionCorpChessListActu;

            // Append new div with opacity 0
            $("#corpMedia").append("<div id=\"corpChessListInner" + actionCorpChessListActuNew + "\" style=\"z-index:" + actionCorpChessListActuNew + "; opacity: 0;\" class=\"corpChessListInner opacity0 cursorPointer\" ></div>");

            // Load content via AJAX
            $.get(baseUrl + "ajax/chess.php?thm=" + direction + "&lg=" + bodyLg + "&project=" + project, function(data) {
                let newDiv = $("#corpChessListInner" + actionCorpChessListActuNew);
                newDiv.addClass('media-list');
                newDiv.html(data);

                let images = newDiv.find('img');
                let loaded = 0;
                let errored = 0;
                let total = images.length;

                if (total === 0) {
                    // No images found, proceed immediately
                    handleComplete();
                    return;
                }

                images.each(function() {
                    let img = new Image();
                    img.src = $(this).attr('src');
                    
                    img.onload = function() {
                        loaded++;
                        checkCompletion();
                    };
                    
                    img.onerror = function() {
                        errored++;
                        $(this).remove(); // Remove the broken image from DOM
                        checkCompletion();
                    };
                });

                function checkCompletion() {
                    if (loaded + errored === total) {
                        handleComplete();
                    }
                }

                function handleComplete() {
                    // Fade in new div after content is processed
                    if (actionCorpChessListActuNew === actionCorpChessListActu) {
                        newDiv.animate({ opacity: 1 }, 200, function() {
                            // Stop loading animation only after the new div is fully shown
                            $("#corpMediaLoad").stop();
                            $("#corpMediaLoad").animate({ opacity: 0 }, 200);
                        });
                    } else {
                        newDiv.remove();
                        $("#corpMediaLoad").stop();
                        $("#corpMediaLoad").animate({ opacity: 0 }, 200);
                    }

                    setTimeout(function() {
                        $("#media_list").mCustomScrollbar('update');
                    }, 100);

                    // $("#media_list").mCustomScrollbar('update');
                    flashMediaMouseOverSettle();
                }

                flashMediaMouseOverSettle();
            });
        }

        // If the old div exists, fade out first, then add a new one
        if (oldDiv.length) {
            oldDiv.stop();
            oldDiv.animate({ opacity: 0 }, 200, function() {
                $(this).remove();
                addNewDiv(); // Call function after removal
            });
        } else {
            addNewDiv(); // Directly add a new div if no old div exists
        }
    }
}


function actionCorpChessListClose(direction) {
    actionCorpChessListActuDelete = actionCorpChessListActu;

    $("#corpMediaLoad").stop();
    $("#corpMediaLoad").animate({ opacity: 0 }, 200);

    $("#corpChessListInner" + actionCorpChessListActuDelete).animate({ opacity: '0' }, 500, function() {
        $(this).remove();
    });
}

// Fonction Auxili?e
function smo(direction) {
    url = document.location.href.split("#")[1];
    url = url.replace(/-/g, '/');
    url = 'https://www.studioko.fr/' + url;

    if (direction == 'i') {
        url = 'https://www.instagram.com/studioko/';
    }
    if (direction == 't') {
        url = 'https://twitter.com/intent/tweet?text=' + url;
    }
    if (direction == 'f') {
        url = 'https://www.facebook.com/sharer.php?u=' + url;
    }
    if (direction == 'o') {
        url = 'https://oeildeko.com/';
    }
    window.open(url);
}

var openInfos = 1;

function open_infos(popUrl) {
    if (window.innerWidth) {
        width = window.innerWidth;
        width = (width * 80) / 100;
        height = window.innerHeight;
        height = (height * 90) / 100;

        // NEW
        width = 979;
        height: 628;
        var left = (window.innerWidth - width) / 2;
        var top = (window.innerHeight - height) / 2;
    } else {
        width = document.body.clientWidth;
        width = (width * 80) / 100;
        height = document.body.clientHeight;
        height = (height * 90) / 100;
        // NEW
        width = 979;
        height: 628;
        var left = (document.body.clientWidth - width) / 2;
        var top = (document.body.clientHeight - height) / 2;
    }
    window.open(popUrl, 'new' + openInfos, 'top=' + top + ', left=' + left + ', width=' + width + ', height=' + height + ',directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no ');
    ++openInfos;
}

// *************** Launch White Web wite

$(document).ready(function() {

    screenWidth = $(window).width();
    squareSize = Math.ceil(screenWidth / 24);

    /*
    $("#launchWhite").css({'width':squareSize+'px','height':squareSize+'px'});
    $("#launchWhiteLink").click(function(){
        alert("ko");
        mozaWhite();
        
    });
    */

});

function mozaWhite(direction) {
    screenWidth = $(window).width();
    screenHeight = $(window).height();

    $("#mozaWhiteWrapper").css({ 'width': screenWidth + 'px', 'height': screenHeight + 'px' });

    squareSize = Math.ceil(screenWidth / 24);
    nbSquare = Math.ceil(screenHeight / squareSize) * 24;

    wrapperWidth = 24 * squareSize;
    wrapperHeight = screenHeight;

    $("#mozaWhiteWrapper").append('<div class="wrapper" style="width:' + wrapperWidth + 'px;height:' + wrapperHeight + 'px;"></div>');

    var squareRandom = [];
    for (i = 1; i <= nbSquare; i++) {
        $("#mozaWhiteWrapper .wrapper").append('<div class="square square' + i + '" style="position:relative;"><!----></div>');
        squareRandom[i - 1] = i;
    }

    $("#mozaWhiteWrapper .square").css({ 'width': squareSize + 'px', 'height': squareSize + 'px' });

    shuffle(squareRandom);

    for (i = 0; i <= nbSquare; i++) {

        // Original speed
        // delaySquare=Math.floor((Math.random() * 500) + 1)+250;
        // timeSquare=Math.floor((Math.random() * 1500) + 1);
        // timeSquare=timeSquare+150;

        delaySquare = Math.floor((Math.random() * 500) + 1) + 250;
        timeSquare = Math.floor((Math.random() * 2500) + 1);
        timeSquare = timeSquare + 300;

        $("#mozaWhiteWrapper .square" + squareRandom[i]).delay(delaySquare).animate({ 'opacity': 1 }, timeSquare, 'easeOutQuart');


        if (i == nbSquare) {
            delaySquareNew = delaySquare + 1;
            $("#mozaWhiteWrapper").delay(delaySquareNew).animate({ 'opacity': 1 }, timeSquare, 'easeOutQuart', function() {
                window.location = "https://www.aroundko.fr/dev5/";
            });
        }
    }
}

function shuffle(array) {
    var currentIndex = array.length,
        temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}
            
// Function to handle navigation
function actionCorpProjectsMove(direction, id) {
    // Get all thumb elements
    const $thumbs = $("#corpMediaScrollNavInner").find('#scroll_nav_indicator_' + id).find('.track-thumb');
    // let currentIndex = $thumbs.filter('.active').index();
    let currentIndex = $thumbs.index($thumbs.filter('.active'));

    // Remove active class from current thumb
    $thumbs.removeClass('active');
    
    // Calculate new index based on direction
    if (direction === 'up') {
        currentIndex = (currentIndex - 1 + $thumbs.length) % $thumbs.length;
    } else if (direction === 'down') {
        currentIndex = (currentIndex + 1) % $thumbs.length;
    }
    
    // Add active class to new thumb
    const $newActive = $thumbs.eq(currentIndex).addClass('active');
    
    // Trigger the click event on the new active thumb
    if ($newActive.length) {
        $newActive[0].click();
    }
}

function getFolderKeyByCateId(cateId) {
    for (let key in projectCatsArray) {
        if (projectCatsArray[key].includes(cateId)) {
            return key;
        }
    }
    return null; // not found
}

function actionProjectScrollNav(type) {
    let hashnavUrl = location.hash;
        hashnavUrl = hashnavUrl.replace("#", "");
    let hashnavArray = hashnavUrl.split('-');

    var allScrolls = $("#corpMediaScrollNavInner").find('.scroll-nav-indicator');

    if (type == 'open') {
        let scrollerId = getFolderKeyByCateId(hashnavArray[2]);
        // console.log('scrollerId:- ' + scrollerId);

        let activeScroll = $("#corpMediaScrollNavInner").find('#scroll_nav_indicator_' + scrollerId);

        allScrolls.not(activeScroll).animate({ 'opacity':'0' }, 300).addClass('hidden');
        allScrolls.not(activeScroll).find('.track-thumb').removeClass('active');
        
        setTimeout(function() {
            let activeScroll = $("#corpMediaScrollNavInner").find('#scroll_nav_indicator_' + scrollerId);
            if (activeScroll.hasClass('hidden')) {
                activeScroll.removeClass('hidden').animate({ 'opacity':'1' }, 300);
                activeScroll.find('.track-thumb').removeClass('active');
                activeScroll.find('#thumb_'+hashnavArray[2]).addClass('active');
            }
        }, 500);
    } else {
        allScrolls.animate({ 'opacity':'0' }, 300).addClass('hidden');
        allScrolls.find('.track-thumb').removeClass('active');
    }
}