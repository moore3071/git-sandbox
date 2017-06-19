var remote = new GitGraph({
	template: "metro",
	orientation: "horizontal",
	mode: "compact"
});
var local =new GitGraph({
	template: "metro",
	orientation: "horizontal",
	mode: "compact",
	elementId: "localGraph"
});
var master = remote.branch("master");
master.commit({sha1: "ead3df3"}).commit({sha1: "3eaa272"}).commit({sha1: "c3abe32"});

var local_master = local.branch("master");
local_master.commit({sha1: "ead3df3"}).commit({sha1: "3eaa272"}).commit({sha1: "c3abe32"}).commit({sha1: "cc23a2e"});

var local_newfeature = local.branch("newfeature");
local_newfeature.commit({sha1:"a325be1"}).commit({sha1: "ab83cce"});

local_master.commit({sha1:"23ce2b4"});

local.commit().commit().commit().commit().commit().commit().commit().commit().commit().commit();
