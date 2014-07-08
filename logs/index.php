<?php
if (isset($_FILES) && 
    isset($_FILES["log"]) &&
    isset($_FILES["log"]["name"]) &&
    isset($_FILES["log"]["tmp_name"]))
{
    if (pathinfo($_FILES["log"]["name"], PATHINFO_EXTENSION) == "log")
    {
        move_uploaded_file($_FILES["log"]["tmp_name"], "./" . $_SERVER["PHP_AUTH_USER"] . ".log");
    }
}

?>