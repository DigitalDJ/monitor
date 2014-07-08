<?php
    header("Content-Type: application/json; charset=utf-8");

    $TYPES = array("log", "service", "progressbar", "text");
    $PROTOCOLS = array("tcp", "http", "https", "icmp");

    function valid_type($type, $arr)
    {
        return in_array($type, $arr, TRUE);
    }    
    
    function valid_name($name)
    {
        return preg_match("/[a-zA-Z0-9\-_]+/", $name);
    }
    
    function valid_hostname($hostname)
    {
        return filter_var(gethostbyname($hostname), FILTER_VALIDATE_IP);
    }
    
    function valid_port($port)
    {
        $valid_port = false;
        if (is_numeric($port))
        {
            $port = intval($port);
            if ($port > 0 && $port < 65536)
            {
                $valid_port = true;
            }
        }
        return $valid_port ? $port : FALSE;
    }
    
    function valid_int($val)
    {
        return is_numeric($val);
    }
    
    function valid_array($arr_name)
    {
        $ret = array();
        if (isset($_GET[$arr_name]) && is_array($_GET[$arr_name]))
        {
            $ret = array_filter($_GET[$arr_name]);
        }
        return $ret;
    }
    
    function get_file_exists($file)
    {
        return file_exists($file);
    }
    
    function get_file_mtime($file)
    {
        $mtime = @filemtime($file);
        if ($mtime === false)
        {
            $mtime = -1;
        }
        return $mtime;
    }
    
    function get_file_contents($file)
    {
        $contents = @file_get_contents($file);
        if ($contents !== false)
        {
            if (strlen($contents) > 1 && substr($contents, 0, 2) === "\xFF\xFE")
            {
                $contents = mb_convert_encoding($contents, "UTF-8", "UTF-16");
            }
        }
        return $contents;
    }
    
    function get_tcp_ping($hostname)
    {
        $success = false;
        $ping = -1;
        
        if (isset($_GET["port"]))
        {
            $port = valid_port($_GET["port"]);
        }
        
        if ($port !== FALSE)
        {
            ini_set("default_socket_timeout", 2);
            $ts = microtime(true);
            $fp = @fsockopen($hostname, $port);
            if ($fp)
            {
                $ping = (microtime(true) - $ts) * 1000;
                $success = true;
                fclose($fp);
            }
        }
        
        return array($success, $ping);
    
    }
    
    function get_icmp_ping($hostname)
    {
        $success = false;
        $ping = -1;
        $package = "\x08\x00\x7d\x4b\x00\x00\x00\x00PingHost";
        $socket = socket_create(AF_INET, SOCK_RAW, getprotobyname("icmp"));
        socket_set_option($socket, SOL_SOCKET, SO_RCVTIMEO, array("sec" => 2, "usec" => 0));
        socket_connect($socket, $hostname, null);

        $ts = microtime(true);
        socket_send($socket, $package, strlen($package), 0);
        if (@socket_read($socket, 255))
        {
            $success = true;
            $ping = (microtime(true) - $ts) * 1000;
        }
        socket_close($socket);
        return array($success, $ping);
    }
    
    function get_http_page($protocol, $hostname)
    {        
        $ping = -1;
        $success = false;
        
        $url = $protocol . "://";
        if (isset($_GET["credentials"]))
        {
            $credentials = $_GET["credentials"];
            if (strlen($credentials) > 0)
            {
                $credentials = explode(":", $credentials);
                if (count($credentials) > 0)
                {
                    $url .= urlencode($credentials[0]);
                }
                if (count($credentials) > 1)
                {
                    $url .= ":" . urlencode($credentials[1]);
                }
                $url .= "@";
            }
        }
        
        if (isset($_GET["port"]))
        {
            $port = valid_port($_GET["port"]);
        }
        
        if ($port === FALSE)
        {
            if ($protocol == "http")
            {
                $port = 80;
            }
            else
            {
                $port = 443;
            }
        }
        
        $url .= $hostname . ":" . $port;
        
        if (isset($_GET["path"]))
        {
            $url .= $_GET["path"];
        }
        else
        {
            $url .= "/";
        }
        
        $sslVerifyPeer = true;
        if (isset($_GET["sslVerifyPeer"]) && 
            filter_var($_GET["sslVerifyPeer"], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) !== NULL)
        {
            $sslVerifyPeer = $_GET["sslVerifyPeer"] == "true";
        }
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, $sslVerifyPeer);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, $sslVerifyPeer ? 2 : 0);
        curl_setopt($ch, CURLOPT_HEADER, true);
        curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_ANY);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        $ts = microtime(true);
        $contents = curl_exec($ch);
        if ($contents !== FALSE)
        {
            $success = true;
        }
        $ping = (microtime(true) - $ts) * 1000;
        curl_close($ch);
        
        return array($success, $url, $contents, $ping);
    }
    
    $response = array("success" => false);
    
    if (isset($_GET["host"]) &&
        isset($_GET["monitor"]) &&
        isset($_GET["hostname"]) &&
        isset($_GET["type"]))
    {
        $host = trim($_GET["host"]);
        $monitor = trim($_GET["monitor"]);
        $hostname = trim($_GET["hostname"]);
        $type = strtolower(trim($_GET["type"]));
        
        if (valid_name($host) && valid_name($monitor) &&
            valid_type($type, $TYPES))
        {
            $file_source = true;
            $success = false;
            
            if (isset($_GET["protocol"]))
            {
                $protocol = strtolower(trim($_GET["protocol"]));
                if (valid_type($protocol, $PROTOCOLS))
                {
                    $file_source = false;
                }
                else
                {
                    unset($protocol);
                }
            }
            
            if ($file_source)
            {
                $filename = "./logs/" . $host . "-" . $monitor . ".log";
                $file_exists = get_file_exists($filename);
                $modification_date = get_file_mtime($filename);
                $contents = get_file_contents($filename);
            }
            else if (valid_hostname($hostname))
            {
                if ($protocol == "http" || $protocol == "https")
                {
                    list ($success, $url, $contents, $ping) = get_http_page($protocol, $hostname);
                }
                else if ($protocol == "tcp")
                {
                    list ($success, $ping) = get_tcp_ping($hostname);
                }
                else if ($protocol == "icmp")
                {
                    list ($success, $ping) = get_icmp_ping($hostname);
                }
            }
            
            $is_stale = false;
            if (isset($modification_date) && $modification_date > -1)
            {
                $stale_after = -1; 
                if (isset($_GET["staleAfter"]) && valid_int($_GET["staleAfter"]))
                {
                    $stale_after = intval($_GET["staleAfter"]);
                }
                if ($stale_after > -1)
                {
                    if (time() - $modification_date > $stale_after)
                    {
                        $is_stale = true;
                    }
                }
            }
            
            if (isset($contents) && $contents !== false)
            {
                $success_strs = valid_array("success");
                $failure_strs = valid_array("failure");

                if (!(count($success_strs) == 0 && count($failure_strs) == 0))
                {
                    // success is determined on matching strings, not successful contents
                    $success = false;                    

                    $success_strs_matched = false;
                    foreach ($success_strs as $success_str)
                    {
                        if (strpos($contents, $success_str) !== false)
                        {
                            $success_strs_matched = true;
                            break;
                        }
                    }
                    
                    $failure_strs_matched = false;
                    foreach ($failure_strs as $failure_str)
                    {
                        if (strpos($contents, $failure_str) !== false)
                        {
                            $failure_strs_matched = true;
                            break;
                        }
                    }
                    
                    if (!$failure_strs_matched)
                    {
                        if ($success_strs_matched || count($success_strs) == 0)
                        {
                            $success = true && !$is_stale;
                        }
                    }
                }
                else if ($type == "progressbar")
                {
                    $obj = json_decode($contents);
                    if (is_object($obj))
                    {
                        $success = true && !$is_stale;
                        $fields = array("max", "min", "now");
                        for ($i = 0; $i < count($fields); $i++)
                        {
                            $field = $fields[$i];
                            if (isset($obj->$field) && is_numeric($obj->$field))
                            {
                                $response[$field] = $obj->$field;
                            }
                            else
                            {
                                $success = false;
                            }
                        }
                    }
                }
                else
                {
                    $success = true;
                }
            }
            
            $response["host"] = $host;
            $response["monitor"] = $monitor;
            $response["type"] = $type;
            $response["hostname"] = $hostname;
            $response["success"] = $success;
            if (isset($url))
            {
                $response["url"] = $url;
            }
            if (isset($ping))
            {
                $response["ping"] = $ping;
            }
            if (isset($file_exists))
            {
                $response["fileExists"] = $file_exists;
            }
            if (isset($is_stale) && isset($file_exists))
            {
                $response["isStale"] = $is_stale;
            }
            if (isset($modification_date) && $modification_date > -1)
            {
                $response["lastModified"] = $modification_date;
            }
            if ($type == "text" && isset($contents) && $contents !== FALSE)
            {
                $response["contents"] = $contents;
            }
        }
    }
    
    echo json_encode($response);
?>