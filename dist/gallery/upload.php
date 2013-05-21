<?php
$mysqli = new mysqli("mysql.stephenoney.com", "euc_upload", "bikesf", "euc_apps");
if ($mysqli->connect_errno) {
    echo "Failed to connect to MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error;
}

function gen_uuid($len=4) {
    $hex = md5("this_is_random_salt" . uniqid("", true));
    $pack = pack('H*', $hex);
    $uid = base64_encode($pack);        // max 22 chars
    $uid = preg_replace("/[^a-z0-9]/", "", $uid);    // mixed case
    //$uid = ereg_replace("[^A-Z0-9]", "", strtoupper($uid));    // uppercase only
    if ($len<4)
        $len=4;
    if ($len>128)
        $len=128;                       // prevent silliness, can remove
    while (strlen($uid)<$len)
        $uid = $uid . gen_uuid(22);     // append until length achieved
    return substr($uid, 0, $len);
}

$uuid = gen_uuid();
$root = $mysqli->real_escape_string($_POST['root']);
$name = $mysqli->real_escape_string($_POST['name']);

if($mysqli->query("INSERT into apps (id, root, name) VALUES ('$uuid', '$root', '$name')")) {
	echo $uuid;
} else {
	echo "error";
}
$mysqli->close();
?>