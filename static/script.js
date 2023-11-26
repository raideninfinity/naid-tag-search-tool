$(document).ready(function(){

    var loadingOverlay = $("#loading-overlay");
    loadingOverlay.hide();
    var loadingSpinner = $("#loading-spinner");
    loadingSpinner.hide();

    var filterMode = 0;
    var pageNum = 1;

    $('#btn-search').on('click', function() {
        performSearch();
    });

    $('#input-search').keydown(function(event){ 
        if (event.key == "Enter") {
            $('#btn-search').trigger('click');
        }
    });

    function setBtnBack(term){
        let btn = $('#btn-back');
        let input = $('#input-search');
        let regexZ = /^z\/.+/;
        let regexG = /^g\/.+/;
        btn.on('click', () => {
            if ((regexZ).test(term)){
                input.val("z/");
                performSearch();
            }
            else if ((regexG).test(term)){
                let match = /^(.+):/.exec(term)
                if (match != null){
                    term = match[1];
                }
                let arr = term.split("/").filter(i => i.trim().length != 0);
                let num = arr.length;
                if (num > 4) num = 4;
                else if (num < 2) num = 2;
                arr = arr.slice(0, num - 1);
                input.val(arr.join("/") + "/");
                performSearch();
            }
        });    
        let enableBack = false;
        if (regexZ.test(term)) enableBack |= true;
        if (regexG.test(term)) enableBack |= true;
        btn.prop("disabled", !enableBack)
    }

    function performSearch(page=1){
        loadingOverlay.show();
        loadingSpinner.show();
        $.ajax({
            url: "/search",
            method: "GET",
            data: {
                term: $("#input-search").val(),
                limit: $("#input-limit").val(),
                min_power: $("#input-minp").val(),
                max_power: $("#input-maxp").val(),
                filter: filterMode,
                page: pageNum
            },
            success: function(data) {
                try{
                    currentTerm = data.params.term;
                    console.log("API Call Success", data)
                    if (data.groups)
                        displayTagGroups(data);
                    else
                        displayTagData(data);
                }catch(e){
                    console.log("API data: ", data);
                    console.error(e);
                    displayError();
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error("API Call Error: ", textStatus, errorThrown);
                displayError();
            },
            complete: function() {
                loadingOverlay.hide();
                loadingSpinner.hide();
            }
        });
    }
    window.performSearch = performSearch;

    function clearTable(){
        $("#table1 tr:not(:first)").remove();
        $("#table-row1 th").remove();
        $("#span-info").text("-");
        $("#span-page").text("- / -");
        $("#btn-goto-page").prop("disabled", true);
        $("#btn-prev-page").prop("disabled", true);
        $("#btn-next-page").prop("disabled", true);
    }

    var backBtn = `<button id="btn-back" class="w3-button inline-button">
        <iconify-icon inline icon="material-symbols:arrow-back-ios-rounded" height="1.0em" style="vertical-align: -0.125em"></iconify-icon>
    </button>`

    function displayError(){
        clearTable(); 
        $("#table-row1").append(`<th>${backBtn}</th>`);
        $("#span-info").text(`An error occurred!`);
        $("#table1").append("<tr><td><i>Error retrieving or displaying search results!</i></td></tr>");
    }

    function displayTagGroups(data){
        clearTable(); 
        $("#table-row1").append(`<th>${backBtn} Tag Groups</th><th>&nbsp;</th>`);
        let table = $("#table1")
        let groups = data.groups;
        $.each(groups, function(index, item) {
            let regexPattern = /^g\/[^\/]+\/[^\/]+\/.+/;
            let regexPattern2 = /^z\//;
            let iconSearch = `<iconify-icon inline icon="mdi:search-plus-outline" height="1.5em" style="vertical-align: -0.25em"></iconify-icon>`;
            let iconTags = `<iconify-icon inline icon="mdi:tags" height="1.5em" style="vertical-align: -0.25em"></iconify-icon>`;
            let iconFd = `<iconify-icon inline icon="material-symbols:arrow-forward-ios" height="1.0em" style="vertical-align: -0.25em"></iconify-icon>`;
            let play, link;
            if (!(regexPattern.test(item) || regexPattern2.test(item)))
                play = `<a href="javascript:void(0);" onclick="(function(){setSearch('${item}/');})()">${iconSearch}</a>`;
            else
                play = `<a href="javascript:void(0);" onclick="(function(){setSearch('${item}:');})()">${iconTags}</a>`;
            link = `<a href="javascript:void(0);" onclick="(function(){setSearch('${item}:');})()">${iconFd}</a>`;
            table.append(`<tr style="word-wrap: break-word;"><td>${play} ${item}</td><td class='w3-right'>${link}</td></tr>`);
        });
        if (data.count != 0){
            $("#span-info").text(`Showing ${data.count} result(s) for "${data.params.term}".`);
        }
        else{
            table.append(`<tr><td><i>No Search Results.</i></td><td></td></tr>`)
            $("#span-info").text(`No results found for "${data.params.term}".`);
        }
        setBtnBack(data.params.term);
    }   

    function displayTagData(data){
        clearTable(); 
        $("#table-row1").append(`<th>${backBtn} Tag Name&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</th><th>Category</th><th>Power</th>`);
        setBtnBack(data.params.term);
    }

    function setSearch(term){
        $("#input-search").val(term);
        window.performSearch();
    }
    window.setSearch = setSearch;

});

function dropdownToggle(){
    var dropdown = $("#dropdown-content-1");
    if (dropdown.hasClass("w3-show")) 
        dropdown.removeClass("w3-show");
    else 
        dropdown.addClass("w3-show");
}