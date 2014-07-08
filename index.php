<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Monitor</title>
        <link href="css/bootstrap.min.css" rel="stylesheet">
        <link href="css/monitor.css" rel="stylesheet">
        <!--[if lt IE 9]>
            <script src="js/html5shiv.min.js"></script>
            <script src="js/respond.min.js"></script>
        <![endif]-->
    </head>
    <body>
        <div id="log-template">
            <span class="log-container">
                <span class="label label-default inline"></span>
            </span>
        </div>
        
        <div id="service-template">
            <span class="service-container">
                <span class="label label-default inline"></span>
            </span>
        </div>

        <div id="text-template">
            <div class="text-container" style="display:block;"> 
                <span class="label label-default progressbar-label"></span>
                <span class="arbitrary-text">&nbsp;</span>
            </div>
        </div>
        
        <div id="progressbar-template">
            <div class="progressbar-container">
                <span class="label label-default progressbar-label"></span>
                <div class="progress progressbar-padding">
                    <div class="progress-bar progress-bar-success" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            </div>
        </div>
        
        <div class="panel panel-default" id="panel-template">
            <div class="panel-heading">
                <h3 class="panel-title hide-overflow">
                    <strong class="host-name"></strong>
                </h3>
                <h3 class="panel-title hide-overflow">
                    <em class="host-hostname"></em>
                </h3>
            </div>
            <div class="panel-body">
                <div class="panel-body-log"></div>
                <div class="panel-body-service"></div>
                <div class="panel-body-progressbar"></div>
                <div class="panel-body-text"></div>
            </div>
            <div class="panel-footer panel-footer-padding">
                <div class="progress loading">
                    <div class="progress-bar progress-bar-striped loading-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
                <div class="time"></div>
                <div class="refresh">
                    <a href="#" class="refresh-link">
                        <img src="img/refresh_small.png" alt="Refresh" class="refresh-small" />
                    </a>
                </div>
            </div>
        </div>

        <div id="column-template">
            <div class="col-sm-4"></div>
        </div>
  
        <div class="container">
            <div class="page-header">
                <h1 class="inline">Monitor</h1>
                <div class="inline refresh-all-align">
                    <a href="#" class="refresh-all-link">
                        <img src="img/refresh.png" alt="Refresh All" class="refresh-all" />
                    </a>
                </div>
            </div>
          
            <div class="row" id="rows"></div>
        </div>
    
        <script src="js/jquery.min.js"></script>
        <script src="js/bootstrap.min.js"></script>
        <script src="js/monitor.js"></script>
    </body>
</html>