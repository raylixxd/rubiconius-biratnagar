hashnavCorpSelect = 'close';
hashnavCorpMenu = 'close';
hashnavCorpDiaryNavigatorA = 'close';
hashnavCorpDiaryNavigatorB = 'close';
hashnavCorpCredits = 'close';
hashnavCorpCreditsCorp = 'close';
hashnavCorpNavigator = 'close';

hashnavCorpChessTeam = 'close';

hashnavCorpChess = 'close';
hashnavCorpChessType = 'close';
hashnavCorpChessProject = 'close';

hashnavCorpComment = 'close';
hashnavCorpCommentType = 'close';

hashnavCorpPagination = 'close';
hashnavCorpPaginationType = 'close';

hashnavCorpMedia = 'close';
hashnavCorpMediaType = 'close';
hashnavCorpMediaLimit = 'close';

hashnavCorpMediaFull = 'close';

hashnavCorpMediaList = 'close';
hashnavCorpMediaListNew = 'close';
hashnavCorpMediaListLimit = 'close';
hashnavCorpMediaListLimitNew = 'close';

hashnavCorpIntro = 'close';
hashnavCorpMediaLimitNew = 'close';

hashnavCorpScroll = 'close';

baseUrl = window.location.origin + '/';
//baseUrl = 'http://localhost/betterandmore/sko/';

Array.prototype.isset = function(o) {
    for (Elt in this) { return (Elt == o) ? true : false }
}

function urlHash(url) {
    url = url.replace(baseUrl, '');
    var elem = url.split('#');
    url = elem[0]
    url = url.replace(/\//g, '-');
    location.hash = url;

    let hashnavUrl = location.hash;
        hashnavUrl = hashnavUrl.replace("#", "");
    let hashnavArray = hashnavUrl.split('-');

    $('body').removeClass(function(index, className) {
        return (className.match(/\bpage-\S+/g) || []).join(' ');
    }).addClass('page-' + hashnavArray[1] + '-' + hashnavArray[2]);
}

function hashnavigatorPreaction() {
    if (location.hash == '') {
        hashnavUrlActu = document.location.href;
        hashnavUrlActu = hashnavUrlActu.replace(baseUrl, '');
        hashnavUrlActu = hashnavUrlActu.replace(/\//g, '-');
        location.hash = hashnavUrlActu;
    }
}

function hashnavigator() {

    // variable 		
    hashnavAjacLauch = false;
    hashnavUrl = location.hash;
    hashnavUrl = hashnavUrl.replace("#", "");
    var hashnavArray = hashnavUrl.split('-');

    hashnavigatorLang();

    // SELECT
    if (hashnavArray[0] == '') {
        // hashnavCorpSelectNew = 'open';
        hashnavCorpSelectNew = 'close';
        hashnavCorpMenuNew = 'close';
        hashnavCorpDiaryNavigatorANew = 'close';
        hashnavCorpDiaryNavigatorBNew = 'close';
        hashnavCorpCreditsNew = 'close';
        hashnavCorpCreditsCorpNew = 'close';
        hashnavCorpNavigatorNew = 'close';

        hashnavCorpChessNew = 'close';
        hashnavCorpChessTypeNew = 'close';
        hashnavCorpChessProjectNew = 'close';

        hashnavCorpChessTeamNew = 'close';

        hashnavCorpCommentNew = 'close';
        hashnavCorpCommentTypeNew = 'close';

        hashnavCorpPaginationNew = 'close';
        hashnavCorpPaginationTypeNew = 'close';

        hashnavCorpMediaNew = 'close';
        hashnavCorpMediaTypeNew = 'close';
        hashnavCorpMediaLimitNew = 'close';
        // hashnavCorpIntroNew = 'close';
        hashnavCorpIntroNew = 'open';
        hashnavCorpMediaListNew = 'close';
        hashnavCorpMediaListLimitNew = 'close';

        hashnavCorpScrollNew = 'close';

        hashnavAjacLauch = true;
    }

    if (hashnavArray[1] == 'intro') {
        hashnavCorpSelectNew = 'close';
        hashnavCorpMenuNew = 'close';
        hashnavCorpDiaryNavigatorANew = 'close';
        hashnavCorpDiaryNavigatorBNew = 'close';
        hashnavCorpCreditsNew = 'close';
        hashnavCorpCreditsCorpNew = 'close';
        hashnavCorpNavigatorNew = 'close';

        hashnavCorpChessNew = 'close';
        hashnavCorpChessTypeNew = 'close';
        hashnavCorpChessProjectNew = 'close';

        hashnavCorpChessTeamNew = 'close';

        hashnavCorpCommentNew = 'close';
        hashnavCorpCommentTypeNew = 'close';

        hashnavCorpPaginationNew = 'close';
        hashnavCorpPaginationTypeNew = 'close';

        hashnavCorpMediaNew = 'close';
        hashnavCorpMediaTypeNew = 'close';
        hashnavCorpMediaLimitNew = 'close';
        hashnavCorpIntroNew = 'open';
        hashnavCorpMediaListNew = 'close';
        hashnavCorpMediaListLimitNew = 'close';

        hashnavCorpScrollNew = 'close';

        hashnavAjacLauch = true;
    }

    // HOME
    if (hashnavArray[1] == 'home') {
        hashnavCorpSelectNew = 'close';
        hashnavCorpMenuNew = 'close';
        hashnavCorpIntroNew = 'close';
        hashnavCorpCreditsNew = 'close';
        hashnavCorpCreditsCorpNew = 'close';
        hashnavCorpDiaryNavigatorANew = 'close';
        hashnavCorpDiaryNavigatorBNew = 'close';
        hashnavCorpMediaNew = 'close';
        hashnavCorpMediaTypeNew = '';
        hashnavCorpMediaLimitNew = '1';

        hashnavCorpCommentNew = 'close';
        hashnavCorpCommentTypeNew = '';

        hashnavCorpPaginationNew = 'close';
        hashnavCorpPaginationTypeNew = 'close';

        hashnavCorpNavigatorNew = 'close';

        hashnavCorpChessNew = 'close';
        hashnavCorpChessTypeNew = 'close';
        hashnavCorpChessProjectNew = 'close';

        hashnavCorpChessTeamNew = 'close';

        hashnavCorpMediaListNew = 'close';
        hashnavCorpMediaListLimitNew = 'close';

        hashnavCorpScrollNew = 'close';

        hashnavAjacLauch = true;
    }

    // DIARY
    if (hashnavArray[1] == 'diary') {

        hashnavCorpSelectNew = 'close';
        hashnavCorpMenuNew = 'open';
        hashnavCorpIntroNew = 'close';
        hashnavCorpCreditsNew = 'open';
        hashnavCorpCreditsCorpNew = 'close';
        hashnavCorpMediaListNew = 'close';
        hashnavCorpMediaListLimitNew = 'close';

        hashnavCorpScrollNew = 'close';

        hashnavCorpDiaryNavigatorANew = hashnavArray[2];
        if (hashnavCorpDiaryNavigatorANew == 'home') {
            hashnavCorpDiaryNavigatorANew = 'close';
        }

        hashnavCorpDiaryNavigatorBNew = hashnavArray[2];
        hashnavCorpNavigatorNew = 'close';

        hashnavCorpChessNew = 'close';
        hashnavCorpChessTypeNew = 'close';
        hashnavCorpChessProjectNew = 'close';

        hashnavCorpChessTeamNew = 'close';

        // Comment
        hashnavCorpCommentTypeNew = '';
        hashnavCorpCommentNew = hashnavArray[2];

        if (hashnavCorpCommentNew == 'home') {
            hashnavCorpCommentNew = 'close';
        } else {
            hashnavCorpCommentNew = hashnavArray[2];
            hashnavCorpCommentTypeNew = 'diary';
        }

        // Media
        hashnavCorpMediaLimitNew = '1';
        hashnavCorpMediaNew = hashnavArray[2];
        hashnavCorpMediaTypeNew = '';

        if (hashnavCorpMediaNew == 'home') {
            hashnavCorpMediaNew = 'close';
        } else {
            hashnavCorpMediaTypeNew = 'diary';
        }

        hashnavAjacLauch = true;
    }

    // PROJECT
    if (hashnavArray[1] == 'project') {
        hashnavCorpSelectNew = 'close';
        hashnavCorpMenuNew = 'open';
        hashnavCorpIntroNew = 'close';
        hashnavCorpCreditsNew = 'open';
        hashnavCorpCreditsCorpNew = 'close';
        hashnavCorpDiaryNavigatorANew = 'close';
        hashnavCorpDiaryNavigatorBNew = 'close';
        hashnavCorpNavigatorNew = '1';

        hashnavCorpChessNew = 'close';
        hashnavCorpChessTypeNew = 'close';
        hashnavCorpChessProjectNew = 'close';

        hashnavCorpChessTeamNew = 'close';

        hashnavCorpMediaListNew = 'close';
        hashnavCorpMediaListLimitNew = 'close';

        hashnavCorpScrollNew = 'open';

        // Comment
        hashnavCorpCommentTypeNew = '';
        hashnavCorpCommentNew = hashnavArray[2];

        if (hashnavCorpCommentNew == 'home') {
            hashnavCorpCommentNew = 'close';
            hashnavCorpScrollNew = 'close';
        } else {
            hashnavCorpCommentNew = hashnavArray[2];

            // we have static comments so show on every click
            // if (hashnavArray[3] != undefined) {
            //     hashnavCorpCommentNew = hashnavArray[3];
            // }

            hashnavCorpCommentTypeNew = 'project';
        }

        hashnavCorpPaginationTypeNew = '';
        hashnavCorpPaginationNew = hashnavArray[2];

        if (hashnavCorpPaginationNew == 'home') {
            hashnavCorpPaginationNew = 'close';
        } else {
            hashnavCorpPaginationNew = hashnavArray[2];
            hashnavCorpPaginationTypeNew = 'project';
        }

        // Media
        hashnavCorpMediaNew = hashnavArray[2];
        hashnavCorpMediaLimitNew = hashnavArray[3];

        if (typeof hashnavCorpMediaLimitNew == 'undefined') {
            hashnavCorpMediaLimitNew = 1;
        } else {
            mediaPaginationActu = hashnavCorpMediaLimitNew;
        }

        hashnavCorpMediaTypeNew = '';
        if (hashnavCorpMediaNew == 'home') {
            hashnavCorpMediaNew = 'close';

            hashnavCorpMediaListNew = 'all';
            hashnavCorpMediaTypeNew = 'projectlist';
        } else {
            hashnavCorpMediaTypeNew = 'project';
        }

        hashnavAjacLauch = true;
    }

    // PROJECTLIST
    if (hashnavArray[1] == 'projectlist') {
        hashnavCorpSelectNew = 'close';
        hashnavCorpMenuNew = 'open';
        hashnavCorpIntroNew = 'close';
        hashnavCorpCreditsNew = 'open';
        hashnavCorpCreditsCorpNew = 'close';
        hashnavCorpDiaryNavigatorANew = 'close';
        hashnavCorpDiaryNavigatorBNew = 'close';
        hashnavCorpMediaNew = 'close';
        hashnavCorpMediaLimitNew = 'close';
        hashnavCorpNavigatorNew = '1';

        hashnavCorpChessNew = 'close';
        hashnavCorpChessTypeNew = 'close';
        hashnavCorpChessProjectNew = 'close';

        hashnavCorpChessTeamNew = 'close';

        hashnavCorpCommentNew = 'close';
        hashnavCorpCommentTypeNew = 'close';

        hashnavCorpPaginationNew = 'close';
        hashnavCorpPaginationTypeNew = 'close';

        hashnavCorpScrollNew = 'close';

        // Media
        hashnavCorpMediaListNew = hashnavArray[2];
        hashnavCorpMediaListLimitNew = hashnavArray[3];

        if (hashnavCorpMediaListNew == 'home') {
            hashnavCorpMediaListNew = 'close';
        }

        hashnavCorpMediaTypeNew = '';
        if (hashnavCorpMediaListNew == 'home') {
            hashnavCorpMediaListNew = 'close';
        } else {
            hashnavCorpMediaTypeNew = 'projectlist';
        }

        hashnavAjacLauch = true;
    }

    // AGENCE
    if (hashnavArray[1] == 'agence') {
        hashnavCorpSelectNew = 'close';
        hashnavCorpMenuNew = 'open';
        hashnavCorpIntroNew = 'close';
        hashnavCorpCreditsNew = 'open';
        hashnavCorpCreditsCorpNew = 'close';
        hashnavCorpDiaryNavigatorANew = 'close';
        hashnavCorpDiaryNavigatorBNew = 'close';
        hashnavCorpNavigatorNew = '2';
        hashnavCorpMediaListNew = 'close';
        hashnavCorpMediaListLimitNew = 'close';

        hashnavCorpScrollNew = 'close';

        hashnavCorpChessNew = 'close';
        hashnavCorpChessTypeNew = 'close';
        hashnavCorpChessProjectNew = 'close';

        if (hashnavArray[2] == 'collaborateur') {
            hashnavCorpChessTeamNew = 1;
        } else {
            hashnavCorpChessTeamNew = '';
        }

        // Comment
        hashnavCorpCommentTypeNew = '';
        hashnavCorpCommentNew = hashnavArray[2];

        if (hashnavCorpCommentNew == 'home' || hashnavCorpCommentNew == 'parcours') {
            hashnavCorpCommentNew = 'close';
        } else {
            hashnavCorpCommentNew = hashnavArray[3];
            hashnavCorpMediaLimitNew = hashnavArray[4];

            if (typeof hashnavCorpMediaLimitNew == 'undefined') {
                hashnavCorpMediaLimitNew = 1;
            } else {
                mediaPaginationActu = hashnavCorpMediaLimitNew;
            }

            if (hashnavCorpCommentNew == 'home') {
                hashnavCorpCommentNew = 'close';
            } else {
                hashnavCorpCommentTypeNew = hashnavArray[2];
            }
        }

        // Pagination
        hashnavCorpPaginationTypeNew = '';
        hashnavCorpPaginationNew = hashnavArray[2];

        if (hashnavCorpPaginationNew == 'home' || hashnavCorpPaginationNew == 'parcours') {
            hashnavCorpPaginationNew = 'close';
        } else {
            hashnavCorpPaginationNew = hashnavArray[3];

            if (hashnavCorpPaginationNew == 'home') {
                hashnavCorpPaginationNew = 'close';
            } else {
                hashnavCorpPaginationTypeNew = hashnavArray[2];
            }
        }

        // Media
        hashnavCorpMediaNew = hashnavArray[2];

        hashnavCorpMediaTypeNew = hashnavArray[1];

        if (hashnavCorpMediaNew == 'home') {
            hashnavCorpMediaNew = 'close';
            hashnavCorpMediaTypeNew = hashnavCorpMediaType;
            hashnavCorpMediaLimitNew = hashnavCorpMediaLimit;
        } else {
            hashnavCorpMediaNew = hashnavArray[3];
            hashnavCorpMediaTypeNew = hashnavArray[2];
            if (hashnavCorpMediaNew == 'home') {
                hashnavCorpMediaNew = 'close';
                hashnavCorpMediaTypeNew = 'agence';
            }
        }
        hashnavAjacLauch = true;
    }

    // PARUTION
    if (hashnavArray[1] == 'parution') {
        hashnavCorpSelectNew = 'close';

        hashnavCorpMenuNew = 'open';
        hashnavCorpIntroNew = 'close';
        hashnavCorpCreditsNew = 'open';
        hashnavCorpCreditsCorpNew = 'close';
        hashnavCorpNavigatorNew = '3';
        hashnavCorpDiaryNavigatorANew = 'close';
        hashnavCorpDiaryNavigatorBNew = 'close';
        hashnavCorpCommentNew = 'close';
        hashnavCorpMediaListNew = 'close';
        hashnavCorpMediaListLimitNew = 'close';

        hashnavCorpScrollNew = 'close';

        hashnavCorpPaginationNew = 'close';

        hashnavCorpChessTeamNew = 'close';

        if (hashnavArray[2] != 'edition' && hashnavArray[2] != 'presse' && hashnavArray[2] != 'monographie' && hashnavArray[2] != 'podcasts') {
            hashnavCorpChessNew = 'home';
            hashnavCorpChessProjectNew = 'close';

        } else {
            if (hashnavArray[2] == 'edition') { hashnavCorpChessNew = '2'; }
            if (hashnavArray[2] == 'presse') { hashnavCorpChessNew = '3'; }
            if (hashnavArray[2] == 'monographie') { hashnavCorpChessNew = '4'; }
            if (hashnavArray[2] == 'podcasts') { hashnavCorpChessNew = '5'; }
        }

        // Comment
        hashnavCorpCommentTypeNew = '';
        hashnavCorpCommentNew = hashnavArray[2];

        if (hashnavCorpCommentNew == 'home') {
            hashnavCorpCommentNew = 'close';
        } else {
            hashnavCorpCommentNew = hashnavArray[3];
            if (hashnavCorpCommentNew == 'home') {
                hashnavCorpCommentNew = 'close';
            } else {
                hashnavCorpCommentTypeNew = hashnavArray[2];
            }
        }

        // Pagination
        hashnavCorpPaginationTypeNew = '';
        hashnavCorpPaginationNew = hashnavArray[2];

        if (hashnavCorpPaginationNew == 'home') {
            hashnavCorpPaginationNew = 'close';
        } else {
            hashnavCorpPaginationNew = hashnavArray[3];
            if (hashnavCorpPaginationNew == 'home') {
                hashnavCorpPaginationNew = 'close';
            } else {
                hashnavCorpPaginationTypeNew = hashnavArray[2];
            }
        }

        // if (hashnavArray[3] != 'home') {
        //     hashnavCorpChessTypeNew = 'close';
        // }

        // Media
        hashnavCorpMediaNew = hashnavArray[2];
        hashnavCorpMediaTypeNew = '';
        if (hashnavCorpMediaNew == 'home') {
            hashnavCorpMediaNew = 'close';
            hashnavCorpChessTypeNew = 'home';
        } else {
            hashnavCorpMediaNew = hashnavArray[3];
            hashnavCorpMediaLimitNew = hashnavArray[4];

            if (typeof hashnavCorpMediaLimitNew == 'undefined') {
                hashnavCorpMediaLimitNew = 1;
            } else {
                mediaPaginationActu = hashnavCorpMediaLimitNew;
            }

            hashnavCorpMediaTypeNew = hashnavArray[2];
            hashnavCorpChessTypeNew = hashnavArray[3];
            hashnavCorpChessProjectNew = hashnavArray[4];

            if (hashnavCorpMediaNew == 'home') {
                hashnavCorpMediaNew = 'close';
                hashnavCorpMediaTypeNew = 'parution';
                hashnavCorpChessTypeNew = 'home';
            }
        }
        hashnavAjacLauch = true;
    }

    // CREDITS
    if (hashnavArray[1] == 'credits') {
        hashnavCorpSelectNew = 'close';
        hashnavCorpMenuNew = 'open';
        hashnavCorpIntroNew = 'close';
        hashnavCorpCreditsNew = 'open';
        hashnavCorpCreditsCorpNew = 'open';
        hashnavCorpDiaryNavigatorANew = 'close';
        hashnavCorpDiaryNavigatorBNew = 'close';
        hashnavCorpMediaNew = 'close';
        hashnavCorpMediaTypeNew = 'close';
        hashnavCorpMediaLimitNew = 'close';
        hashnavCorpCommentNew = 'close';
        hashnavCorpNavigatorNew = 'close';

        hashnavCorpChessNew = 'close';
        hashnavCorpChessTypeNew = 'close';
        hashnavCorpChessProjectNew = 'close';

        hashnavCorpChessTeamNew = 'close';

        hashnavCorpCommentTypeNew = 'close';
        hashnavCorpMediaListNew = 'close';
        hashnavCorpMediaListLimitNew = 'close';

        hashnavCorpPaginationNew = 'close';
        hashnavCorpPaginationTypeNew = 'close';

        hashnavCorpScrollNew = 'close';

        hashnavAjacLauch = true;
    }

    // Contact
    if (hashnavArray[1] == 'contact') {
        hashnavCorpSelectNew = 'close';
        hashnavCorpMenuNew = 'open';
        hashnavCorpIntroNew = 'close';
        hashnavCorpCreditsNew = 'open';
        hashnavCorpCreditsCorpNew = 'close';
        hashnavCorpDiaryNavigatorANew = 'close';
        hashnavCorpDiaryNavigatorBNew = 'close';
        hashnavCorpNavigatorNew = '4';

        hashnavCorpChessNew = 'close';
        hashnavCorpChessTypeNew = 'close';
        hashnavCorpChessProjectNew = 'close';

        hashnavCorpChessTeamNew = 'close';

        // Comment
        hashnavCorpCommentTypeNew = '';
        hashnavCorpCommentNew = 'close';

        hashnavCorpPaginationNew = 'close';
        hashnavCorpPaginationTypeNew = '';

        // Media
        hashnavCorpMediaNew = 'cp';
        hashnavCorpMediaTypeNew = 'contactpm';
        hashnavCorpMediaListNew = 'close';
        hashnavCorpMediaListLimitNew = 'close';

        hashnavCorpScrollNew = 'close';

        hashnavAjacLauch = true;
    }

    // LANGUE
    if (bodyLg != hashnavArray[0] && hashnavArray[0] != '') {
        hashnavCorpSelectNew = 'close';
        hashnavCorpMenuNew = 'close';
        hashnavCorpDiaryNavigatorANew = 'close';
        hashnavCorpDiaryNavigatorBNew = 'close';
        hashnavCorpCreditsNew = 'close';
        hashnavCorpCreditsCorpNew = 'close';
        hashnavCorpNavigatorNew = 'close';

        hashnavCorpChessNew = 'close';
        hashnavCorpChessTypeNew = 'close';
        hashnavCorpChessProjectNew = 'close';

        hashnavCorpChessTeamNew = 'close';

        hashnavCorpCommentNew = 'close';
        hashnavCorpCommentTypeNew = 'close';

        hashnavCorpPaginationNew = 'close';
        hashnavCorpPaginationTypeNew = 'close';

        hashnavCorpMediaNew = 'close';
        hashnavCorpMediaTypeNew = 'close';
        hashnavCorpMediaLimitNew = 'close';
        hashnavCorpIntroNew = 'close';
        hashnavCorpMediaListNew = 'close';
        hashnavCorpMediaListLimitNew = 'close';

        hashnavCorpScrollNew = 'close';

        hashnavAjacLauch = true;

        $("#delayId").animate({ opacity: 1 }, 550, function() {
            hashnavigator();
        });

        bodyLg = hashnavArray[0];
    }

    if (hashnavAjacLauch) {
        actionCorpMediaFullClose('close');

        // MENU hashnavCorpMenu
        if (hashnavCorpMenu != hashnavCorpMenuNew) {
            actionCorpMenu(hashnavCorpMenuNew);
            hashnavCorpMenu = hashnavCorpMenuNew;
        }

        // NAVIGATOR hashnavCorpNavigator
        if (hashnavCorpNavigator != hashnavCorpNavigatorNew) {
            if (hashnavCorpNavigatorNew == 'close') {
                actionCorpNavigatorClose('close');
            } else {
                actionCorpNavigator(hashnavCorpNavigatorNew, '0100', '104', hashnavCorpMediaNew);
            }
            hashnavCorpNavigator = hashnavCorpNavigatorNew;
        }

        // NAVIGATOR A ( DIARY LEFT )hashnavCorpDiaryNavigatorA
        if (hashnavCorpDiaryNavigatorA != hashnavCorpDiaryNavigatorANew) {
            if (hashnavCorpDiaryNavigatorANew == 'home') {
                if (hashnavCorpDiaryNavigatorA == 'close') {
                    // open
                    // actionCorpDiaryNavigatorA('open', hashnavArray[2]);
                } else {
                    // slide
                    // actionCorpDiaryNavigatorAChange(hashnavArray[2]);
                }
            }

            if (hashnavCorpDiaryNavigatorANew == 'close') {
                // close
                // actionCorpDiaryNavigatorA('close');
            }

            if (hashnavCorpDiaryNavigatorANew != 'home' && hashnavCorpDiaryNavigatorANew != 'close') {
                if (hashnavCorpDiaryNavigatorA == 'close') {
                    // open
                    // actionCorpDiaryNavigatorA('open', hashnavArray[2]);
                } else {
                    // slide
                    // actionCorpDiaryNavigatorAChange(hashnavArray[2]);
                }
            }

            hashnavCorpDiaryNavigatorA = hashnavCorpDiaryNavigatorANew;
        }

        // NAVIGATOR B ( DIARY RIGHT ) hashnavCorpDiaryNavigatorB
        //alert(hashnavCorpDiaryNavigatorB+' - '+hashnavCorpDiaryNavigatorBNew);

        if (hashnavCorpDiaryNavigatorB != hashnavCorpDiaryNavigatorBNew) {
            if (hashnavCorpDiaryNavigatorBNew == 'home') {
                if (hashnavCorpDiaryNavigatorB == 'close') {
                    // open
                    actionCorpDiaryNavigatorB('open', hashnavArray[2]);
                } else {
                    // change
                    //actionCorpDiaryNavigatorBChange(hashnavArray[2]);
                    actionCorpDiaryNavigatorB('open', hashnavArray[2]);
                }
            }

            if (hashnavCorpDiaryNavigatorBNew == 'close') {
                // close
                actionCorpDiaryNavigatorB('close');
            }

            if (hashnavCorpDiaryNavigatorBNew != 'home' && hashnavCorpDiaryNavigatorBNew != 'close') {
                if (hashnavCorpDiaryNavigatorB == 'close') {
                    // open
                    // actionCorpDiaryNavigatorB('open', hashnavArray[2]);
                } else {
                    // Change
                    // actionCorpDiaryNavigatorBChange(hashnavArray[2]);
                    // actionCorpDiaryNavigatorB('open', hashnavArray[2]);
                }
            }
            hashnavCorpDiaryNavigatorB = hashnavCorpDiaryNavigatorBNew;
        }

        // CHESS hashnavCorpChess
        if (
            (hashnavCorpMediaNew === 'close' && hashnavCorpChess != hashnavCorpChessNew) || 
            hashnavCorpChessTypeNew === 'home' || 
            (hashnavCorpChessTypeNew === 'home' && hashnavCorpChessProject != hashnavCorpChessProjectNew) 
        ) {
            actionCorpChessList(hashnavCorpChessNew, hashnavCorpChessTypeNew, hashnavCorpChessProjectNew);

            hashnavCorpChess = hashnavCorpChessNew;
            hashnavCorpChessType = hashnavCorpChessTypeNew;
        }

        // CHESS hashnavCorpChessTeam
        if (hashnavCorpChessTeam != hashnavCorpChessTeamNew) {
            if(hashnavCorpChessTeamNew=='close') {
                actionCorpChessClose('close');
            } else {
                actionCorpChess(hashnavCorpChessTeamNew,'0','170');
            }
            hashnavCorpChessTeam=hashnavCorpChessTeamNew;
        }

        // CHESS Mouvement
        if (hashnavCorpChess == 2 || hashnavCorpChess == 3) {
            // actionCorpChessMove(hashnavArray[2], hashnavArray[3]);
        }

        // Credits Corp hashnavCorpCreditsCorp
        if (hashnavCorpCreditsCorp != hashnavCorpCreditsCorpNew) {
            actionhashnavCorpCreditsCorp(hashnavCorpCreditsCorpNew);
            hashnavCorpCreditsCorp = hashnavCorpCreditsCorpNew;
        }

        // COMMENTS hashnavCorpComment
        if (hashnavCorpComment != hashnavCorpCommentNew || hashnavCorpCommentType != hashnavCorpCommentTypeNew) {
            // close
            if (hashnavCorpCommentNew == 'close') {
                actionCorpCommentClose('close');
            } else {
                // Project
                if (hashnavCorpCommentTypeNew == 'project') {
                    actionCorpComment('project', hashnavCorpCommentNew);
                }

                // Agence
                if (hashnavCorpCommentTypeNew == 'agence') {
                    actionCorpComment('agence', hashnavCorpCommentNew);
                }

                // collaborateur
                if (hashnavCorpCommentTypeNew == 'collaborateur') {
                    actionCorpComment('collaborateur', hashnavCorpCommentNew);
                }

                // edition
                if (hashnavCorpCommentTypeNew == 'edition') {
                    actionCorpComment('edition', hashnavCorpCommentNew);
                }

                // edition
                if (hashnavCorpCommentTypeNew == 'presse') {
                    actionCorpComment('presse', hashnavCorpCommentNew);
                }

                // monographie
                if (hashnavCorpCommentTypeNew == 'monographie') {
                    actionCorpComment('monographie', hashnavCorpCommentNew);
                }
            }

            hashnavCorpComment = hashnavCorpCommentNew;
            hashnavCorpCommentType = hashnavCorpCommentTypeNew;
        }

        // Pagination hashnavCorpPagination
        if (hashnavCorpPagination != hashnavCorpPaginationNew || hashnavCorpPaginationType != hashnavCorpPaginationTypeNew) {
            // close
            if (hashnavCorpPaginationNew == 'close') {
                actionCorpPaginationClose('close');
            } else {
                // Project
                if (hashnavCorpPaginationTypeNew == 'project') {
                    actionCorpPagination('project', hashnavCorpPaginationNew);
                }

                // Agence
                if (hashnavCorpPaginationTypeNew == 'agence') {
                    actionCorpPagination('agence', hashnavCorpPaginationNew);
                }

                // collaborateur
                if (hashnavCorpPaginationTypeNew == 'collaborateur') {
                    actionCorpPagination('collaborateur', hashnavCorpPaginationNew);
                }

                // edition
                if (hashnavCorpPaginationTypeNew == 'edition') {
                    actionCorpPagination('edition', hashnavCorpPaginationNew);
                }

                // edition
                if (hashnavCorpPaginationTypeNew == 'presse') {
                    actionCorpPagination('presse', hashnavCorpPaginationNew);
                }

                // monographie
                if (hashnavCorpPaginationTypeNew == 'monographie') {
                    actionCorpPagination('monographie', hashnavCorpPaginationNew);
                }
            }

            hashnavCorpPagination = hashnavCorpPaginationNew;
            hashnavCorpPaginationType = hashnavCorpPaginationTypeNew;
        }

        // MEDIA hashnavCorpMedia

        //alert(hashnavCorpMediaNew+' - '+hashnavCorpMediaTypeNew+' - '+hashnavCorpMediaLimitNew);
        if (hashnavCorpMedia != hashnavCorpMediaNew || hashnavCorpMediaType != hashnavCorpMediaTypeNew || hashnavCorpMediaLimit != hashnavCorpMediaLimitNew) {
            if (hashnavCorpMediaTypeNew == 'karlolivier') {
                actionCorpMediaFull(hashnavCorpMediaNew, hashnavCorpMediaTypeNew, hashnavCorpMediaLimitNew);
            } else {
                actionCorpMedia(hashnavCorpMediaNew, hashnavCorpMediaTypeNew, hashnavCorpMediaLimitNew);
            }

            //alert('lim : '+hashnavCorpMediaLimitNew);
            actionCorpMediaNavColor(hashnavCorpMediaLimitNew);

            hashnavCorpMedia = hashnavCorpMediaNew;
            hashnavCorpMediaType = hashnavCorpMediaTypeNew;
            hashnavCorpMediaLimit = hashnavCorpMediaLimitNew;

            /*
            A revoir, cette action à une erreur qui fait empeche la suite de se produits (
            test : index.php -> fr -> project = le select ne disparait pas )
            */
        }

        // PROJECT LIST hashnavCorpMediaList
        if (hashnavCorpMediaList != hashnavCorpMediaListNew || hashnavCorpMediaType != hashnavCorpMediaTypeNew || hashnavCorpMediaLimit != hashnavCorpMediaListLimitNew) {

            actionCorpMediaList(hashnavCorpMediaListNew, hashnavCorpMediaTypeNew, hashnavCorpMediaListLimitNew);

            hashnavCorpMediaList = hashnavCorpMediaListNew;
            hashnavCorpMediaType = hashnavCorpMediaTypeNew;
        }

        // SELECT hashnavCorpSelect
        if (hashnavCorpSelect != hashnavCorpSelectNew) {
            actionCorpSelect(hashnavCorpSelectNew);
            hashnavCorpSelect = hashnavCorpSelectNew;
        }

        // INTRO hashnavCorpIntro
        if (hashnavCorpIntro != hashnavCorpIntroNew) {
            hashnavCorpIntro = hashnavCorpIntroNew;
            actionCorpIntro(hashnavCorpIntro);
        }

        // CREDITS hashnavCorpCredits
        if (hashnavCorpCredits != hashnavCorpCreditsNew) {
            actionCorpCredits(hashnavCorpCreditsNew);
            hashnavCorpCredits = hashnavCorpCreditsNew;
        }

        if (hashnavCorpScroll != hashnavCorpScrollNew || hashnavCorpScrollNew == 'close') {
            actionProjectScrollNav(hashnavCorpScrollNew);
        }
    }
}

function hashnavigatorLang() {
    // Change Language Link
    hashnavLangLink = location.hash;
    hashnavLangLinkLg = hashnavLangLink.substring(1, 3);
    if (hashnavLangLinkLg == 'fr') {
        hashnavLangLink = 'en-' + hashnavLangLink.substring(4);
        hashnavLangLink = hashnavLangLink.replace(/-/g, '/') + '#' + hashnavLangLink;
    } else {
        hashnavLangLink = 'fr-' + hashnavLangLink.substring(4);
        hashnavLangLink = hashnavLangLink.replace(/-/g, '/') + '#' + hashnavLangLink;
    }

    $("#creditsLanguageButton").attr('href', hashnavLangLink);
}