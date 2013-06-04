<?php
$mysqli = new mysqli("mysql.stephenoney.com", "euc_upload", "bikesf", "euc_apps");
if ($mysqli->connect_errno) {
    echo "Failed to connect to MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error;
}

if($_GET['id']) {
	$id = $mysqli->real_escape_string($_GET['id']);
	$res = $mysqli->query("SELECT root from apps WHERE id='$id' LIMIT 1");
	while ($row = $res->fetch_assoc()) {
		$root = addslashes($row['root']);
		echo "<script type='text/javascript'>var root_str = '$root';localStorage.setItem('post', root_str);</script>";
	}
	echo "<meta http-equiv='refresh' content='0; url=../'>";
} else {
	echo "<html><head><link rel='stylesheet' type='css' href='style.css'></head><body>";

	$res = $mysqli->query("SELECT id, name, updated from apps ORDER BY updated DESC");

	while ($row = $res->fetch_assoc()) {
		$timestamp = strtotime($row['updated']);
		$formatted_date = date("D M j", $timestamp);
		$formatted_time = date("h:i a", $timestamp);
		echo "<a id='example' href='?id=$row[id]'><span class='name'>$row[name]</span><span class='date'>$formatted_date</span><span class='time'>$formatted_time</span></a>";
	}
	echo "</body></html>";
}


$mysqli->close();
?>
