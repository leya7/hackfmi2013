$(document).ready(function(){
     sys = arbor.ParticleSystem(1000, 400,1);
     sys.renderer = Renderer('#viewport');
     sys.parameters({gravity : true});
	 $('#SelectedSubject').hide();
});


function can_be_used_by(x, y){
    /* determines if knowledge from subject x can be used by
       other subject y
       (when x provides a tag on which y depends)
    */
    provides_length = (x.Provides ? x.Provides.length : 0);
    depends_length = (y.Depends ? y.Depends.length : 0);
    for(var d = 0; d < provides_length;d++){
        for(var e = 0;e < depends_length;e++){
            if(x.Provides[d] == y.Depends[e]){
                return true;
            }
        }
    }
}


el = 2;//new Everlive('RhGb6ryktMNcAwj9');

function ClearNodes(){
	var nodes = [];
	sys.eachNode(function(node){nodes.push(node);});
	for (i = 0; i < nodes.length; i++){
		sys.pruneNode(nodes[i]);
	}
	selected = undefined;
}

function FairyCtrl($scope){
    $scope.subjects = [];
    $scope.edges = [];
    g_subjects = {};
	g_nodes = {};
	$scope.aliases = [];
	$scope.majors = [];

    $scope.getMajor = function(major){
    	var filter = { "Name" : major };
        $scope.edges = [];
        $scope.subjects = [];

		$.ajax({
            url: 'https://api.everlive.com/v1/RhGb6ryktMNcAwj9/Major/',
            type: "GET",
			dataType: 'json',
            headers: {"X-Everlive-Filter" : JSON.stringify(filter)},
            success: function(data){
				var parsedData = data;
                if(parsedData.Count === 0){
                  return;
                }

                for(i = 0;i < parsedData.Result[0].Subjects.length; i++){
                    $scope.subjects.push(parsedData.Result[0].Subjects[i]);
                }
                $scope.getAliases(major);
                
            },
            error: function(error){
                //alert(JSON.stringify(error));
            }
        });
    };

    $scope.getAliases = function(major){
		var filter = { "Major" : major };
		$scope.aliases = [];
		$.ajax({
            url: 'https://api.everlive.com/v1/RhGb6ryktMNcAwj9/Alias/',
            type: "GET",
			dataType: 'json',
            headers: {"X-Everlive-Filter" : JSON.stringify(filter)},
            success: function(data){
				//var parsedData = $.parseJSON(data);
                var parsedData = data;
				for(i = 0; i < parsedData.Result.length; i++){
					$scope.aliases.push(parsedData.Result[i]);
                }

				$scope.getSubjects();
            },
            error: function(error){
                //alert(JSON.stringify(error));
            }
        });
    };

    $scope.getAllMajors = function(){
        $.ajax({
            url: 'https://api.everlive.com/v1/RhGb6ryktMNcAwj9/Major',
            type: "GET",
			dataType: 'json',
            success: function(data) {
				$scope.$apply(function() {
					//var parsedData = $.parseJSON(data);
					var parsedData = data;
					var majors = parsedData.Result;

					for(var i = 0; i < majors.length; i++){
						$scope.majors.push(majors[i]);
					}
				});
            },
            error: function(error){
                //alert(JSON.stringify(error));
            }
        });
    };

	$scope.getSubjects = function(){

        var filter = { "Name" : { "$in" : $scope.subjects } };

        $.ajax({
            url: 'https://api.everlive.com/v1/RhGb6ryktMNcAwj9/Subject',
            type: "GET",
			dataType: 'json',
            headers: {"X-Everlive-Filter" : JSON.stringify(filter)},
            success: function(data){

				var parsedData = data;
                var subjects = parsedData.Result; //[0].Subjects;

				ClearNodes();

				for(var i = 0; i < subjects.length;i++){

					for(var j=0; j < $scope.aliases.length; j++){

                    	if (subjects[i].Name == $scope.aliases[j].Subject) {
							subjects[i].Name = $scope.aliases[j].Name;
							break;
						}
					}


                    g_nodes[subjects[i].Name] = sys.addNode(
                        subjects[i].Name,
                        {'label' : subjects[i].Name});
					g_subjects[subjects[i].Name] = subjects[i];

                    for(var j = i + 1;j < subjects.length;j++){

                        if(can_be_used_by(subjects[i], subjects[j])){
                            $scope.edges.push([subjects[i], subjects[j], subjects[i]]);
                        }
                        if(can_be_used_by(subjects[j], subjects[i])){
                            $scope.edges.push([subjects[j], subjects[i], subjects[j]]);
                        }
                    }
                }

                $scope.drawEdges();
            },
            error: function(error){
                //alert(JSON.stringify(error));
            }
        });
    };

    $scope.drawEdges = function(){
        for(var d = 0;d < $scope.edges.length;d++){
            var newEdge = sys.addEdge(
                g_nodes[$scope.edges[d][0].Name],
                g_nodes[$scope.edges[d][1].Name],
				$scope.edges[d][2].Provides);
			newEdge.color = "rgba(0,0,0, .7)";
			newEdge.lineWidth = 2;
        }
    };

	$scope.getAllMajors();
	maj = document.URL.split('#')[1];
	maj = maj.replace(/(%20)/g, ' ');
	$scope.getMajor(maj);

	$scope.getMajor(maj);

	$("#Majors1").change(function()
	{
		$scope.getMajor($("#Majors1").find(':selected').val());
	});
	setTimeout(function(){ $("#Majors1").val(maj); }, 1000);

}
