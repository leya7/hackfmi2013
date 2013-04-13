$(document).ready(function(){
     sys = arbor.ParticleSystem(1000, 400,1);
     sys.renderer = Renderer('#viewport');
     sys.parameters({gravity : true});
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


function FairyCtrl($scope){
    $scope.subjects = ['d', 'e'];
    $scope.edges = [];
    $scope.nodes = {};
	$scope.aliases = [];

    $scope.getProgramme = function(){

        var filter = { "Name" : $("#programme").val() };
        $scope.edges = [];
        $scope.subjects = [];
        $scope.nodes = {};

        $.ajax({
            url: 'https://api.everlive.com/v1/RhGb6ryktMNcAwj9/Major/',
            type: "GET",
            headers: {"Authorization" : "MasterKey Fhs7GIJFRVeAftm59rE4h2C8eT7MTVu0",
                      "X-Everlive-Filter" : JSON.stringify(filter)},
            success: function(data){

                if(data.Count === 0){
                  return;
                }

                for(i = 0;i < data.Result[0].Subjects.length; i++){
                    $scope.subjects.push(data.Result[0].Subjects[i]);
                }
                $scope.getAliases();
            },
            error: function(error){
                alert(JSON.stringify(error));
            }
        });
    };

    $scope.getAliases = function () {

		var filter = { "Major" : $("#programme").val() };

		$.ajax({
            url: 'https://api.everlive.com/v1/RhGb6ryktMNcAwj9/Alias/',
            type: "GET",
            headers: {"Authorization" : "MasterKey Fhs7GIJFRVeAftm59rE4h2C8eT7MTVu0",
                      "X-Everlive-Filter" : JSON.stringify(filter)},
            success: function(data){

                if(data.Count === 0){
                  return;
                }

                for(i = 0; i < data.Result.length; i++){
					$scope.aliases.push(data.Result[i]);
                }

				$scope.getSubjects();
            },
            error: function(error){
                alert(JSON.stringify(error));
            }
        });

	};

	$scope.getSubjects = function(){

        var filter = { "Name" : { "$in" : $scope.subjects } };

        $.ajax({
            url: 'https://api.everlive.com/v1/RhGb6ryktMNcAwj9/Subject',
            type: "GET",
            headers: {"Authorization" : "MasterKey Fhs7GIJFRVeAftm59rE4h2C8eT7MTVu0",
                      "X-Everlive-Filter" : JSON.stringify(filter)},
            success: function(data){
                var subjects = data.Result; //[0].Subjects;

                for(var i = 0; i < subjects.length;i++){

					for(var j=0; j < $scope.aliases.length; j++){

                    	if (subjects[i].Name == $scope.aliases[j].Subject) {
							subjects[i].Name = $scope.aliases[j].Name;
							break;
						}
					}


                    $scope.nodes[subjects[i].Name] = sys.addNode(
                        subjects[i].Name,
                        {'label' : subjects[i].Name});

                    for(var j = i + 1;j < subjects.length;j++){

                        if(can_be_used_by(subjects[i], subjects[j])){
                            $scope.edges.push([subjects[i], subjects[j], subjects[i]]);
                        }
                        if(can_be_used_by(subjects[j], subjects[i])){
                            $scope.edges.push([subjects[j], subjects[i], subjects[j]]);
                        }
                    }
                }

                //console.log($scope.edges);
                $scope.drawEdges();

                /* debug
                for(var d = 0;d < $scope.edges.length;d++){
                    var edge = $scope.edges[d];
                    console.log(edge[0].Name + ' ' + edge[1].Name);
                };*/
            },
            error: function(error){
                alert(JSON.stringify(error));
            }
        });
    };

    $scope.drawEdges = function(){
        for(var d = 0;d < $scope.edges.length;d++){
            sys.addEdge(
                $scope.nodes[$scope.edges[d][0].Name],
                $scope.nodes[$scope.edges[d][1].Name],
				$scope.edges[d][2].Provides);
        }
    };
}




