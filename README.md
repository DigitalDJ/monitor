Monitor
=======

Monitor is a simple monitoring panel made in PHP.

Requirements
------------

- A web server with PHP 5.4+ support
- A web server with authentication support
- [Bootstrap 3.2.0]
- [jQuery 1.11.1]
- [html5shiv 3.7.2-4]
- [Respond.js 1.4.2]
- Some hosts to monitor

Web Server will needs write access to *./logs/* (for hosts uploading log files) and *./hosts/* (to store last seen values)

For each host that will upload a file, a user must created with the name *hostfriendlyname-monitorname* template. 

For example, if host *localhost* has log *backup* in the configuration JSON, the username to upload logs must match *localhost-backup*. The log file will be stored as *localhost-backup.log*.

Download and extract the *css*, *fonts* and *js* directories from Bootstrap into Monitor's directory. Additionally, add the jQuery, html5shiv and Respond.js JS files into the *js* folder.

Version
-------
0.1

Sample Configuration
--------------------
Configuration should be stored as *config.json* in Monitor's directory.

JSON cannot contain comments. They are provided only for explanation.

```sh
{
    // the friendly name of this host
    "localhost":                   
    {
        // the actual hostname
        // if the hostname starts with the friendly name,
        // that portion will not be shown in the UI
        "hostname": "localhost",  

        // (optional) the amount of time (in seconds) the host is allowed to disappear
        // each time a service is available or a valid log file is found,
        // the last seen time for the host is updated to either the current time,
        // or the last modified time of the log file
        // hostCanBeDown == -1: the host must always be up. 
        // if any monitor reports an error, the overall status of the host stays the same.
        // 
        // hostCanBeDown == 0: the host may be down for any number of seconds.
        // if a service is unavailable or a log file is stale, the overall status of the host will report OK
        //
        // hostCanBeDown > 0: the host can only be down for up to n seconds.
        // if a service is unavailable or log file is stale, the overall status of the host will report OK,
        // until the last seen time of the host exceeds the hostCanBeDown value.
        "hostCanBeDown": 3600,
        
        // the list of monitors
        "monitors"                 
        {
            // a monitor that reads a log, checks for strings for success / failure
            // in this case, a user named "localhost-backup" needs to be created to upload log files
            "backup":              
            {
                // type "log" looks for a file "localhost-backup" in ./logs
                "type": "log",     
                
                // an array of strings that can be matched to determine if the log was successful (can be empty)
                "success": [       
                            "Success!" 
                           ],
                // an array of strings that can be matched to determined if the log failed (can be empty)
                "failure": [       
                            "Failure!" 
                           ],
                           
                // the time in seconds that determines if this log file is no longer relevant (last modified comparison)
                // note: both success and failure are optional. 
                // if neither are specified, the only check that occurs is staleAfter
                // if staleAfter is -1 or unspecified, only the existence of "localhost-backup.log" is checked               
                "staleAfter": 3600
            },
            
            // a monitor that checks if port 22/tcp is open
            "ssh":                 
            {
                "type": "service",
                "port": 22,       
                "protocol": "tcp"
            },
            
            // a monitor that checks if the host responds to icmp echo
            "ping":                 
            {
                "type": "service",      
                "protocol": "icmp"
            },
            // a monitor that performs a HTTP(S) GET and can checks for strings
            "http":
            {
                "type": "service",      
                // can be http or https
                "protocol": "https",
                // you must specify a port 1 - 65535
                "port": 443,             
                // the path to the file or page
                "path": "/",             
                // ensure there are no ssl security errors, 
                // false will skip both CA and CN checks
                "sslVerifyPeer": true,   
                // must be in the format user:password 
                // will attempt better authentication (i.e. digest) before other options (i.e. basic)
                "credentials": "user:pass",
                // you can also optionally use success / failure strs to check the contents of the page  
                // the contents of the page includes HTTP response headers
                "success": [ "Page!" ],
                "failure": [ "Not Page!" ]
            },
            // a monitor that reads a log for specific json to build a progressbar
            // in this case, "localhost-disk.log" must exist and contain JSON in the following format:
            // { "min": <float>, "max": <float>, "now": <float> }
            // where min is the smallest possible value, 
            // maximum is the highest possible value and 
            // now is the measured value
            // progressbar can also be generated from HTTP-GET by specifying "protocol": "http" / "https"
            // and other relevant details
            "disk":                 
            {
                "type": "progressbar",
                // again, checks whether the progressbar json is relevant
                "staleAfter": 3600,
                // the percentage at which the progress bar turns orange
                "warning": 60,
                // the percentage at which the progress bar turns red
                "danger": 80
            },
            // a monitor that inserts arbitrary html into the hosts panel
            // perhaps use this to report the status of commands on the machine
            // this may be a log, or HTTP GET
            "uptime-via-http":
            {
                "type": "text",
                // if true, this will force the text to appear under the label
                // else, the text is appended next to the label
                "newLine": true, 
                // can be http or https
                "protocol": "https",
                // you must specify a port 1 - 65535
                "port": 443,             
                // the path to the file or page
                "path": "/uptime",             
                // the conditions below will colour the label that is directly above the text
                "success": [ "Page!" ],
                "failure": [ "Not Page!" ]
            },
            "uptime-via-log":
            {
                "type": "text",
                // the conditions below will determine the colour the label that is directly above the text
                "staleAfter": 3600,
                "failure": [ "command not found" ]
            }
        }
    }
}
```

License
-------

MIT

[Bootstrap 3.2.0]:https://github.com/twbs/bootstrap/releases/download/v3.2.0/bootstrap-3.2.0-dist.zip
[jQuery 1.11.1]:http://code.jquery.com/jquery-1.11.1.min.js
[html5shiv 3.7.2-4]:https://github.com/aFarkas/html5shiv/zipball/master
[Respond.js 1.4.2]:https://github.com/scottjehl/Respond/archive/1.4.2.zip
