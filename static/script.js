$(document).ready(function(){

    var loadingOverlay = $("#loading-overlay");
    loadingOverlay.hide();
    var loadingSpinner = $("#loading-spinner");
    loadingSpinner.hide();

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
                filter: parseInt($("#select-filter").val()),
                page: page
            },
            success: function(data) {
                try{
                    currentTerm = data.params.term;
                    //console.log("API Call Success", data)
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
        $("#span-info").text("-");
        $("#span-page").text("-");
        $("#span-pages").text("-");
        $("#btn-goto-page").prop("disabled", true);
        $("#btn-prev-page").prop("disabled", true);
        $("#btn-next-page").prop("disabled", true);
    }

    var backBtn = `<button id="btn-back" class="w3-button inline-button">
        <iconify-icon inline icon="material-symbols:arrow-back-ios-rounded" height="1.0em" style="vertical-align: -0.125em"></iconify-icon>
    </button>`

    function displayError(){
        clearTable(); 
        $("#table-row1").html(`<th>${backBtn}</th>`);
        $("#span-info").text(`An error occurred!`);
        $("#table1").append("<tr><td><i>Error retrieving or displaying search results!</i></td></tr>");
    }

    function displayTagGroups(data){
        clearTable(); 
        $("#table-row1").html(`<th>${backBtn} Tag Groups</th><th>&nbsp;</th>`);
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
        let table = $("#table1");
        let page = data.params.page;
        let limit = data.params.limit;
        $("#table-row1").html(`<th>${backBtn} Tag Name</th><th style="td-c">Category</th><th style="td-c">Power</th>`);
        $.each(data.tags, function(index, item) {
            let tag_name = item.tag_name;
            let d_category = item.d_category;
            let z_category = item.z_category;
            let d_count = item.d_count;
            let n_count = item.n_count;
            let count = Math.min(10000, n_count == 0 ? d_count : n_count)
            let row = `<tr class="c-${d_category}">`;
            //Insert Name
            let iconCopy = `<iconify-icon inline icon="fa-regular:copy" height="1.0em" style="vertical-align: -0.125em"></iconify-icon>`;
            let iconPlus = `<iconify-icon inline icon="fa-solid:plus-square" height="1.0em" style="vertical-align: -0.125em"></iconify-icon>`;
            let copyLink = `<a href="javascript:void(0);" class="c-none" id="copy-link-${index}">${iconCopy}<div id="copy-tooltip-${index}" class="copy-tooltip"></div></a> `
            let tag = tag_name
            if (d_count > 0){
                let tag_d = tag_name.replace(/ /g, "_");
                let link = `https://danbooru.donmai.us/wiki_pages/${encodeURIComponent(tag_d)}`
                tag = `<a href="${link}" target="_blank">${tag_name}</a>`
            }
            row += `<td>${copyLink} ${tag}</td>`
            //Insert Category
            let z_icon = ""
            if (z_category){
                let z_categories = z_category.join('<br>');
                z_categories = z_categories.replace(/danbooru - /g, "");
                z_categories = z_categories.replace(/ /g, "&nbsp;");
                z_icon = ` <div class="icon-tooltip c-none">${iconPlus}<div class="tooltip-text">${z_categories}</div></div>`
            }
            row += `<td class="td-c">${d_category}${z_icon}</td>`
            //Insert Count
            let iconN = `<iconify-icon inline icon="fa-solid:pen-nib" height="1.0em" style="vertical-align: -0.125em"></iconify-icon>`;
            let iconD = `<iconify-icon inline icon="fa-regular:image" height="1.0em" style="vertical-align: -0.125em"></iconify-icon>`;
            let count_tooltip = `${iconN} ${n_count == 0 ? "N/A" : n_count}<br>${iconD} ${d_count}`;
            let count_icon = ` <div class="icon-tooltip c-none">${(n_count > 0 ? iconN : iconD)}<div class="tooltip-text">${count_tooltip}</div></div>`
            row += `<td class="td-c">${count_icon} ${count}</td>`
            //Finalize
            $("#table1").append(row + "</tr>");

            //Copy Tooltip
            $(`#copy-link-${index}`).on('click', () => {
                navigator.clipboard.writeText(tag_name).then(() => {
                    showTooltip(index, "Copied!");
                    setTimeout((index) => { hideTooltip(index); }, 500, index);
                }).catch(function (err) {
                    showTooltip(index, "Error copying!");
                    setTimeout((index) => { hideTooltip(index); }, 500, index);
                });
            });
        });
        if (data.count != 0){
            let start = (page - 1) * limit + 1;
            let end = Math.min(data.count, page * limit);
            $("#span-info").text(`Showing tags ${start} to ${end} out of ${data.count} result(s) for "${data.params.term}".`);
            let pages = Math.ceil(data.count / limit);
            $("#span-page").text(`${page}`);
            $("#span-pages").text(`${pages}`);
            if (pages > 1) $("#btn-goto-page").prop("disabled", false);
            if (page > 1) $("#btn-prev-page").prop("disabled", false);
            if (page < pages) $("#btn-next-page").prop("disabled", false);
        }
        else{
            table.append(`<tr><td><i>No Search Results.</i></td><td></td></tr>`)
            $("#span-info").text(`No results found for "${data.params.term}".`);
        }
        setBtnBack(data.params.term);
    }

    function showTooltip(index, message) {
        var tooltip = $(`#copy-tooltip-${index}`);
        tooltip.text(message);
        var buttonRect = $(`#copy-link-${index}`)[0].getBoundingClientRect();
        tooltip.css('top', buttonRect.top - 30 + 'px');
        tooltip.css('left', buttonRect.left + 'px');
        tooltip.show();
    }

    function hideTooltip(index) {
        var tooltip = $(`#copy-tooltip-${index}`);
        tooltip.hide();
    }

    $("#btn-apply").click(function(){
        performSearch();
    });

    $("#btn-next-page").click(function(){
        let page = parseInt($("#span-page").text());
        performSearch(page+1);
    });

    $("#btn-prev-page").click(function(){
        let page = parseInt($("#span-page").text());
        performSearch(page-1);
    });

    $("#btn-goto-page").click(function(){
        let pages = parseInt($("#span-pages").text());
        let input = window.prompt("Go to which page?", $("#span-page").text());
        if (input != null && input != ""){
            input = parseInt(input);
            if (input < 1) input = 1;
            else if (input > pages) input = pages;
            performSearch(input);
        }
        
    });

    function setSearch(term){
        $("#input-search").val(term);
        window.performSearch();
    }
    window.setSearch = setSearch;

});

function dropdownToggle(){
    var dropdown = $("#dropdown-content-1");
    if (dropdown.hasClass("w3-show")){ 
        dropdown.removeClass("w3-show");
        $("#icon-toggle").attr("icon", "mdi:menu-down");
    }
    else{ 
        dropdown.addClass("w3-show");
        $("#icon-toggle").attr("icon", "mdi:menu-up");
    }
}