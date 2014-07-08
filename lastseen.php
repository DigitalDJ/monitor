<?php
    header("Content-Type: application/json; charset=utf-8");
    $response = array("success" => false);
    if (isset($_GET["host"]) && isset($_GET["lastSeen"]))
    {
        $new_last_seen = trim($_GET["lastSeen"]);
        $name = preg_replace("/[^a-zA-Z0-9\\-_]/", "", trim($_GET["host"]));
        $success = false;
        
        if (is_numeric($new_last_seen))
        {
            $new_last_seen = intval($new_last_seen);
        }
        else
        {
            $new_last_seen = -1;
        }
        
        $last_seen = -1;
        
        if (strlen($name) > 0)
        {
            $filename = "hosts/" . $name;
            if (file_exists($filename))
            {
                $contents = file_get_contents($filename);
                if ($contents !== false)
                {
                    $contents = trim($contents);
                    if (is_numeric($contents))
                    {
                        $last_seen = intval($contents);
                    }
                }
            }
            
            if ($new_last_seen > $last_seen)
            {
                $last_seen = $new_last_seen;
                file_put_contents($filename, $last_seen);
            }
            
            $response["host"] = $name;
            $response["lastSeen"] = $last_seen;
            $response["success"] = true;
        }
    }
    
    echo json_encode($response);
?>