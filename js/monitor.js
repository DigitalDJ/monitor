var NUM_COLS = 3;
var TITLE_IGNORE = [ "host", "monitor", "success", "hostname", "contents",
                     "max", "min", "now", "type" ];
var PROGRESS_BAR_VARS = [ "min", "max", "now" ];
var MONITOR_SCRIPT = "monitor.php";
var LASTSEEN_SCRIPT = "lastseen.php";

var config;
var checkRefreshAllTimer = 0;

$.getJSON("config.json", handle_json);

function check_refresh_all_complete()
{
    if ($(".refresh:hidden").length <= 1)
    {
        $(".refresh-all-link").fadeIn();
        clearInterval(checkRefreshAllTimer);
    }
}

function handle_refresh_all()
{
    var nodes = $(".refresh-link:visible");
    $(".refresh-all-link").fadeOut();
    var delay = 0;
    $.each(nodes, function (k, v) {
        setTimeout(function() 
        {
            v.click();
        }, delay);
        delay += 200;
        if (k == nodes.length - 1)
        {
            checkRefreshAllTimer = setInterval("check_refresh_all_complete();", 1000);
        }
    });
}

function replace_label_class(before_class, new_class)
{
    // replace all colours with new class
    return before_class.replace("success", new_class)
                       .replace("warning", new_class)
                       .replace("danger", new_class)
                       .replace("default", new_class)
}

function handle_lastseen_success(data)
{
    // if we have valid data, do something
    if (data.hasOwnProperty("host") && data.hasOwnProperty("lastSeen"))
    {
        var id = data["host"];
        var id_node = $("#" + id);
        var last_seen = data["lastSeen"];
        
        if (id_node)
        {
            var d = new Date(data["lastSeen"] * 1000);
            // set the last seen for this host
            $(id_node).find(".panel-title").attr("title", "lastSeen: " + d.toLocaleString());
        
            // only check hostCanBeDown if the host is down
            // host is down if the overall status is failure
            if ($(id_node).attr("class").indexOf("success") == -1)
            {
                var node_config = config[id];
                // if we have a hostCanBeDown config option
                if (node_config.hasOwnProperty("hostCanBeDown"))
                {
                    var hostCanBeDown = node_config["hostCanBeDown"];
                    var host_can_be_down = false;
                    // if hostCanBeDown is a time value and host has been seen before
                    if (hostCanBeDown > 0 && last_seen > -1)
                    {
                        // check if the host is stale
                        if ( (new Date()).getTime() <= (last_seen * 1000) + (hostCanBeDown * 1000) )
                        {
                            // host is within allowed time
                            host_can_be_down = true;
                        }
                    }
                    // else if hostCanBeDown is zero, it can always be down
                    else if (hostCanBeDown == 0)
                    {
                        host_can_be_down = true;
                    }
                    
                    // if we determine this host can be down
                    // we should check that nothing is stale
                    if (host_can_be_down)
                    {
                        var stale_ok = true;
                        
                        $.each(node_config["monitors"], function (k, v)
                        {
                            var label_id_node = $("#" + id + "-" + k);
                            var labels = $(label_id_node).find(".label");
                            
                            // check all logs / resources that are file-check based
                            if ($(labels).attr("title").indexOf("fileExists") > -1 && 
                                $(labels).attr("class").indexOf("success") == -1)
                            {
                                // if not, host is still not ok
                                stale_ok = false;
                                // break
                                return false;
                            }
                            // keep looping
                            return true;
                        });
                        
                        // if logs are ok, and host can be down, turn this host into success
                        if (stale_ok)
                        {
                            $(id_node).attr("class", replace_label_class($(id_node).attr("class"), "success"));
                        }
                    }
                }
            }
        }
    }
}

function calculate_last_seen(id_node)
{
    // go through all the labels
    var last_seen = -1;
    var curr_time = Math.round((new Date()).getTime() / 1000);
    $.each($(id_node).find(".label"), function (k, v)
    {
        // if we have a label that returned ping OK, last seen = now
        if ($(v).attr("title") && 
            $(v).attr("title").indexOf("ping") >= 0 && 
            $(v).attr("title").indexOf("ping: -1") < 0)
        {
            last_seen = curr_time;
        }
        // if we have a monitor that has last-modified
        else
        {
            var last_modified = $(v).attr("last-modified");
            if (last_modified)
            {
                last_modified = parseInt(last_modified);
                if (last_modified > last_seen)
                {
                    last_seen = last_modified;
                }
            }
        }      
    });
    
    // check with the server which is the best last seen value
    var data = { }
    data["host"] = $(id_node).attr("id");
    data["lastSeen"] = last_seen;
    
    $.get(LASTSEEN_SCRIPT, data).success(handle_lastseen_success);
}

function update_progress_bar(id_node)
{
    // update the loading bar width
    var loading_bar = $(id_node).find(".loading-bar");
    var total_length = $(loading_bar).attr("aria-valuemax");
    var curr_length = $(loading_bar).attr("aria-valuenow");
    curr_length++;
    $(loading_bar).attr("aria-valuenow", curr_length.toString());
    $(loading_bar).width(((curr_length / total_length)* 100) + "%"); 
    
    // if we're 100%
    if (total_length == curr_length)
    {
        // fade out the bar, fade in the refresh button / last updated
        $(id_node).find(".loading").fadeOut("slow", function()
        {
            $(id_node).find(".time").html(new Date().toLocaleString());
            $(id_node).find(".refresh").fadeIn();
            $(id_node).find(".time").fadeIn();
        });
        
        // colour the panel success or fail
        if ($(id_node).find(".label-success").length == total_length)
        {
            $(id_node).attr("class", replace_label_class($(id_node).attr("class"), "success"));
        }
        else
        {       
            $(id_node).attr("class", replace_label_class($(id_node).attr("class"), "danger"));
        }
        
        // calculate last seen of this host for hostCanBeDown
        calculate_last_seen(id_node);
    }
}

function handle_get_success(data)
{
    // get the name of the node
    var id = data["host"];
    var id_node = $("#" + id);
    var label_id = data["monitor"];
    var label_id_node = $("#" + id + "-" + label_id);
    var config_node = config[id]["monitors"][label_id];
       
    var response = false;
    // get the true/false response
    if (data.hasOwnProperty("success"))
    {
        response = data["success"];
    }
    
    // if we have this label
    if (label_id_node && id_node)
    {
        // update with the appropriate status colour
        var labels = $(label_id_node).find(".label");

        var label_class = "default";
       
        if (response)
        {
            label_class = "success";
        }
        else
        {
            // if stale, turn yelllow, else, red
            if (data.hasOwnProperty("isStale") && data["isStale"])
            {
                label_class = "warning";
            }
            else
            {
                label_class = "danger";
            }
        }
                
        // add the label text
        var label_str = "";
        $.each(data, function(k, v)
        {
            // don't display things we already know or display
            if ($.inArray(k, TITLE_IGNORE) == -1)
            {
                var value = v;
                // if we have a date, make it readable
                // store the last-modified value
                if (k == "lastModified")
                {
                    var d = new Date(v * 1000);
                    value = d.toLocaleString();
                    $(labels).attr("last-modified", v);
                }
            
                label_str += k + ": " + value + " ";
            }
        });
        label_str = label_str.trim();

        if (label_str.length > 0)
        {
            $(labels).attr("title", label_str);
        }
        
        // if progress bar, set it up
        if (data.hasOwnProperty("type") && data["type"] == "progressbar")
        {
            var progress_bar = $(label_id_node).find(".progress-bar");
            var all_progress_vars = true;
            $.each(PROGRESS_BAR_VARS, function (k1, v1)
            {
                if (!data.hasOwnProperty(v1))
                {
                    all_progress_vars = false;
                }
            });
            
            if (all_progress_vars)
            {
                // normalise
                var total = data[PROGRESS_BAR_VARS[1]] - data[PROGRESS_BAR_VARS[0]];
                var curr = data[PROGRESS_BAR_VARS[2]] + (total - data[PROGRESS_BAR_VARS[1]]);
                var progress_text = "";
                $.each(PROGRESS_BAR_VARS, function (k1, v1)
                {
                    progress_text += v1 + ": " + data[v1] + " ";

                });
                
                // div by zero
                if (total != 0)
                {
                    var perc = (curr / total) * 100;
                    $(progress_bar).width(perc + "%"); 
                    
                    progress_text += "perc: " + perc;    
                    
                    // if percentage greater than warning value
                    if (config_node.hasOwnProperty("warning"))
                    {
                        if (perc >= config_node["warning"])
                        {
                            label_class = "warning";
                        }
                    }
                    
                    // else perc greater than danger value
                    if (config_node.hasOwnProperty("danger"))
                    {
                        if (perc >= config_node["danger"])
                        {
                            label_class = "danger";
                        }
                    }
                    
                    // else, we fall back to label_class, which is probably green unless failure
                    
                }

                progress_text = progress_text.trim();
                if (progress_text.length > 0)
                {
                    $(labels).attr("title", $(labels).attr("title") + "\n" + progress_text);
                }
                
                $(progress_bar).attr("class", replace_label_class($(progress_bar).attr("class"), label_class));
            }
            
            $.each(PROGRESS_BAR_VARS, function (k1, v1)
            {
                if (data.hasOwnProperty(v1))
                {
                    $(progress_bar).attr("aria-value" + v1, data[v1]);
                }
            });
        }
        
        // insert the arbitrary html if text type
        if (data.hasOwnProperty("type") && data["type"] == "text")
        {
            if (data.hasOwnProperty("contents"))
            {
                var textarea = $(label_id_node).find(".arbitrary-text");
                var html = data["contents"];
                if (config_node.hasOwnProperty("newLine") && config_node["newLine"])
                {
                    html = "<br />" + html;
                }
                $(textarea).html(html);
            }
        }
        
        // set the label colour last, since progress bar warning / error might change it
        $(labels).attr("class", replace_label_class($(labels).attr("class"), label_class));
    }
    
    // update the hosts overall progress bar
    update_progress_bar(id_node);
}

function handle_refresh(e)
{
    // parent panel that called this refresh
    var node = $(e.currentTarget).parents(".panel");
    var name = node.attr("id");
    var config_node = config[name];
    
    // how many services does this config have for progress bar
    var total_length = 0;
    if (config_node.hasOwnProperty("monitors")) total_length += Object.keys(config_node["monitors"]).length;

    // set up the progress bar with values
    var loading_bar = $(node).find(".loading-bar");
    loading_bar.attr("aria-valuemax", total_length);
    loading_bar.attr("aria-valuenow", "0");

    // reset labels
    $.each($(node).find(".label"), function (k, v)
    {
        $(v).attr("class", replace_label_class($(v).attr("class"), "default"));
        $(v).removeAttr("title");
    });
    
    // reset text
    $.each($(node).find(".arbitrary-text"), function (k, v)
    {
        $(v).html("&nbsp;");
    });
    
    // reset progress bars
    $.each($(node).find(".panel-body-progressbar").find(".progress-bar"), function (k, v)
    {
        $(v).attr("aria-valuemax", "100");
        $(v).attr("aria-valuemin", "0");
        $(v).attr("aria-valuenow", "0");
        $(v).width("0%");
    });
        
    // reset panel
    $(node).attr("class", replace_label_class($(node).attr("class"), "default"));
    $(node).find(".panel-title").removeAttr("title");
    
    // hide last updated time
    $(node).find(".time").fadeOut();
    // remove the refresh button, we just clicked it
    $(node).find(".refresh").fadeOut("slow", function()
    {
        // fade in the progress bar
        $(node).find(".loading").fadeIn();
        
        // each label, figure out what data to send
        $.each(config_node["monitors"], function (k1, v1)
        {
            v1["host"] = name;
            v1["hostname"] = config_node["hostname"]; 
            v1["monitor"] = k1;
            
            var data = { };
            // if the value is an array, the GET var needs to be key[]
            $.each(v1, function (k2, v2)
            {
                var key = k2;
                if (Array.isArray(v2))
                {
                    key = k2 + "[]";
                }    
                data[key] = v2;
            });

            // send it off
            $.get(MONITOR_SCRIPT, data)
            .success(handle_get_success).error(function(id_node, k2) {
                var label_id_node = $("#" + id_node.attr("id") + "-" + k2)
                var label_id_node_labels = $(label_id_node).find(".label");
                
                $(label_id_node_labels).attr("class", replace_label_class($(label_id_node_labels).attr("class"), "danger"));
                $(label_id_node_labels).attr("title", "GET: error");
                
                update_progress_bar(id_node);
            }.bind(this, node, k1));
            
        });
    });
    
    // return false for the onlick handler
    // prevent jumping page when scrolling because href is #
    return false;
}

function valid_name(name)
{
    var success = false;
    // is a string
    if ($.type(name) == "string")
    {
        // is not an empty string
        if (name.length > 0)
        {
            // does not contain invalid characters
            if (/^[A-Za-z0-9\-_]+$/.test(name))
            {
                success = true;
            }
        }
    }
    
    return success;
}

function handle_json(data)
{
    // set config globally
    config = data;
   
    // setup the number of columns we want
    var col_template = $("#column-template div")
    for (var i = 0; i < NUM_COLS; i++)
    {
        $("#rows").append($(col_template).clone());
    }
    
    // for each item in config, create the panel in a column
    var curr_col;
    $.each(config, function (k, v) 
    {
        // ensure we have a valid object
        if (valid_name(k) && v.hasOwnProperty("hostname"))
        {
            if (!curr_col || curr_col.length <= 0)
            {
                curr_col = $("#rows .col-sm-4:first");
            }
            
            // clone a panel, make sure it doesnt display yet
            var new_panel = $("#panel-template").clone();
            new_panel.fadeOut();
            
            // give it a new id and populate it with name
            $(new_panel).attr("id", k);
            $(new_panel).find(".host-name").html(k);
            
            // if the name is the start of the hostname, truncate part of the hostname
            var hn = v["hostname"];
            if (hn.indexOf(k) == 0)
            {
                hn = hn.substring(k.length);
            }
            // then set the hostname in the panel
            $(new_panel).find(".host-hostname").html(hn);
            
            // for each service/log/resource
            $.each(v["monitors"], function (k1, v1)
            {
                // if valid
                if (valid_name(k1) && v1.hasOwnProperty("type"))
                {                    
                    // make sure type is valid
                    if (v1["type"] == "progressbar" ||
                        v1["type"] == "text" ||
                        v1["type"] == "service" ||
                        v1["type"] == "log")
                    {
                        var search_template = "#" + v1["type"] + "-template ." + v1["type"] + "-container";
                        var append_to = ".panel-body-" + v1["type"];
                        
                        // clone, customize, append
                        var new_label = $(search_template).clone();
                        $(new_label).attr("id", k + "-" + k1);
                        $(new_label).find(".label").html(k1);
                        $(new_panel).find(append_to).append(new_label);
                    }
                }
            });
            
            // add a refresh event handler
            $(new_panel).find(".refresh-link").click(handle_refresh);
            
            // append the panel
            $(curr_col).append(new_panel);
            
            // fade it in
            new_panel.fadeIn();
            
            // move to the next column
            curr_col = curr_col.next(".col-sm-4");
        }
    });
    
    // add the refresh-all event handler
    $(".refresh-all-link").click(handle_refresh_all);    
}

