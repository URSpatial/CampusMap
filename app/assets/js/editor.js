var webmap,
  map,
  view,
  locateBtn,
  edit,
  searchWidget,
  locator,
  focusBlockID,
  blockLayer,
  statusLayer,
  oppsLayer,
  blockFeature,
  isEditMode,
  viewLegend,
  highlight,
  editor,
  featureForm,
  unselectFeature,
  modal,
  handleStatusChange,
  updateStatus,
  toggleEdit,
  updateConditionInfo,
  init,
  hasConditionEdits, lyrExpand,
  openStreetView,
  editLog,
  loadOppsStats,
  autoSelect;
var useLocation = false;
var username = "Guest";
var hasConditionEdits = false;
var zoomBlock, zoomBlockID;
const mapid = "e926f4487bef43b1acad2ae3efcc0dc3";
window.onload = function () {
  focusBlockID = getUrlParameter("block");
  layoutPage();
};
require([
  "esri/config",
  "esri/Map",
  "esri/views/MapView",
  "esri/WebMap",
  "esri/widgets/Legend",
  "esri/widgets/Editor",
  "esri/layers/FeatureLayer",
  "esri/Graphic",
  "esri/widgets/Expand",
  "esri/widgets/FeatureForm",
  "esri/widgets/FeatureTemplates",
  "esri/form/elements/inputs/TextAreaInput",
  "esri/portal/Portal",
  "esri/identity/OAuthInfo",
  "esri/identity/IdentityManager",
  "esri/widgets/LayerList",
  "esri/geometry/SpatialReference",
  "esri/geometry/projection"
], function (
  esriConfig,
  Map,
  MapView,
  WebMap,
  Legend,
  Editor,
  FeatureLayer,
  Graphic,
  Expand,
  FeatureForm,
  FeatureTemplates,
  TextAreaInput,
  Portal,
  OAuthInfo,
  esriId,
  LayerList,
  SpatialReference,
  Projection
) {
  esriConfig.apiKey =
    "AAPKeb2be7bc06164f7fa155c78475a559b1K_sjQ2bBeZaoM4GCG9jxa4kh-51XCRhRQpuR4CJkwW45buZxA60FRvtJzDUfYci0";
  const authInfo = new OAuthInfo({
    appId: "7ICATN7fF64t7BMB",
    popup: false, // the default,
    portalUrl: "https://univredlands.maps.arcgis.com",
  });
  esriId.registerOAuthInfos([authInfo]);

  esriId
    .checkSignInStatus(authInfo.portalUrl + "/sharing")
    .then((u) => {
      handleSignedIn(u);
    })
    .catch(() => {
      handleSignedOut();
    });

  function handleSignedIn(user) {
    username = user.userId;
    const portal = new Portal();
    portal.load().then((e) => {
      $("#login").hide();
      $(".modal-content").show();
      $(".modal").hide();

      //const results = { name: portal.user.fullName, username: portal.user.username };
      //username= portal.user.username;
      //document.getElementById("results").innerText = JSON.stringify(results, null, 2);
      //console.log(JSON.stringify(results, null, 2));
    });
  }

  function handleSignedOut() {
    //document.getElementById("results").innerText = 'Signed Out'
    console.log("Signed Out");
    $(".modal").show();
    $(".modal-content").hide();
    $("#login").show();
  }
  $("#btnLogin").click(function () {
    esriId.getCredential(authInfo.portalUrl).then(function (e) {
      console.log(e);
      user = e;
      $("#login").hide();
      //$("#page").show();
      //loadApp();
    });
  });
  $("#btnLogout").click(function () {
    esriId.destroyCredentials();
    window.location.reload();
  });
  editLog = new FeatureLayer({
    url: "https://services.arcgis.com/o6oETlrWetREI1A2/arcgis/rest/services/Mapathon_Edit_Log/FeatureServer/0"
  });
  editLog.load();
  map = new Map({
    basemap: "arcgis-topographic", // Basemap layer service
  });
  webmap = new WebMap({
    portalItem: {
      id: mapid,
    },
  });
  view = new MapView({
    // map: map,
    center: [-117.17752045715889, 34.05006751742645], // Longitude, latitude
    zoom: 13, // Zoom level
    map: webmap,
    container: "mapView", // Div element
  });
  viewLegend = new Legend({
    view: view,
  });
  view.ui.add(viewLegend, "bottom-right");
  autoSelect=function(){
    var query = blockLayer.createQuery();
        (query.where = "EditStatus ='Incomplete'"), (query.returnGeometry = false), (query.outFields = ["MapathonBlockID"]);
        blockLayer.queryFeatures(query).then(function (response) {
        if (response.features.length > 0){
          var randIndex = Math.floor(Math.random() * response.features.length );
          var randID = response.features[randIndex].attributes["MapathonBlockID"];
          selectBlock(randID);
          changePage("blockPage");
        }
        });
  }
  const selectBlockAction = {
    title: "Select Block",
    id: "select-block",
    image: "assets/img/select.png",
  };
  
  view.when(function () {
    var hideLayers = ["ANCA Opportunities", "Edit Status", "Neighborhood Blocks"]
    const layerList = new LayerList({
      view: view,
      listItemCreatedFunction: function (event) {

        // The event object contains properties of the
        // layer in the LayerList widget.

        //   let item = event.item;
        //   if (hideLayers.includes(item.title))
        //   {
        //     item.open = false;
        //   }
      }
    });
    lyrExpand = new Expand({
      view: view,
      content: layerList
    });
    // Add widget to the top right corner of the view
    view.ui.add(lyrExpand, "top-left");
    view.map.allLayers.find(function (layer) {
      if (hideLayers.includes(layer.title)) {
        layer.listMode = "hide";
      }
      if (layer.title === "Neighborhood Blocks") {
        blockLayer = layer;
        blockLayer.visible = true;
        //
        if (focusBlockID) {
          selectBlock(focusBlockID);
          changePage("blockPage");
        } else {
          //hideInfoPanel();
          changePage("statusPage");
        }
        blockLayer.on("layerview-create", function (event) {
          // The LayerView for the layer that emitted this event
          blockLayer.popupTemplate.actions = [selectBlockAction];

          updateStatus();
          //toggleEdit();
          blockLayer.visible = $("#blockPage").visible;
          //event.layerView;
        });
      } else if (layer.title === "Edit Status") {
        statusLayer = layer;
        statusLayer.visible = true;
      } else if (layer.title === "ANCA Opportunities") {
        oppsLayer = layer;
        oppsLayer.on("layerview-create", function (event) {
          setupEditor();
          $("#oppsStats > img").show()
          setTimeout(function () {
            ;
            loadOppsStats();
          }, 2000);
        });

      }

      loadOppsStats = function () {
        // $("#oppsStats > img").show();
        if ($("#oppsStats > .esri-legend__layer-table").length == 0) {
          if ($(".esri-legend__layer-table").length > 0) {
            var oppsSymbols = $(".esri-legend__layer-table").first().clone();
            if (oppsSymbols.text().indexOf("Bike")>-1){
              $("#oppsStats").append(oppsSymbols);
              
            }
            else{
              loadOppsStats();
              return;
            }
            
          }
        }
        // if($.trim($("#oppsStats").html())==''){

        // }




        var oppsQuery = oppsLayer.createQuery();
        (oppsQuery.where = "1=1"), (oppsQuery.returnGeometry = false), (oppsQuery.outFields = ["OppType"]);
        oppsLayer.queryFeatures(oppsQuery).then(function (oppsResponse) {

          var oppCounts = {};
          for (k = 0; k < oppsResponse.features.length; k++) {
            var theType = oppsResponse.features[k].attributes["OppType"];
            if (theType in oppCounts) {
              oppCounts[theType] += 1;
            } else {
              oppCounts[theType] = 1;
            }
          }
          $("#oppsStats > .esri-legend__layer-table > .esri-legend__layer-body").children(".esri-legend__layer-row").each(function (index) {

            if (typeof ($(this).children(".esri-legend__layer-cell--info").data("oppType")) == "undefined") {
              $(this).children(".esri-legend__layer-cell--info").data("oppType", $(this).children(".esri-legend__layer-cell--info").text());
            }
            var oppType = $(this).children(".esri-legend__layer-cell--info").data("oppType");
            //$(this).children(".esri-legend__layer-cell--info").text($(this).children(".esri-legend__layer-cell--info").data("oppType") + )


            if (oppType in oppCounts) {
              $(this).children(".esri-legend__layer-cell--info").text(oppType + " (" + oppCounts[oppType] + ")");
            } else {
              $(this).children(".esri-legend__layer-cell--info").text(oppType + " (0)");
            }

            //console.log( index + ": " + $( this ).text() );
          });

        }).then(
          function () {
            if ($("#oppsStats > .esri-legend__layer-table").length > 0) {
              $("#oppsStats > img").hide()
            }
          });

      }
    });
  });
  //
  zoomBlock = function () {
    view.goTo(blockFeature);
  };
  openStreetView = function () {

    var geoPoint = Projection.project(blockFeature.geometry.centroid, SpatialReference.WGS84);
    var url = "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=" + geoPoint.latitude + "," + geoPoint.longitude;
    window.open(url, '_blank');
    //https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=-37.8136,144.9631
  }
  view.popup.on("trigger-action", (event) => {
    // Execute the measureThis() function if the measure-this action is clicked
    if (event.action.id === "select-block") {
      selectBlock(view.popup.features[0].attributes["MapathonBlockID"]);
      view.popup.visible = false;
    }
  });
  zoomBlockID = function (blockID) {
    var query = blockLayer.createQuery();
    (query.where = "mapathonBlockID = " + blockID), (query.returnGeometry = true), (outFields = ["mapathonBlockID"]);
    blockLayer.queryFeatures(query).then(function (response) {
      if (response.features.length > 0) {
        view.goTo(response.features[0]);
      }

    });
  }
  updateStatus = function () {
    var query = blockLayer.createQuery();
    (query.where = "1=1"), (query.returnGeometry = false);
    var counts = {
      complete: 0,
      incomplete: 0,
      locked: 0,
    };

    blockLayer.queryFeatures(query).then(function (response) {
      var features = response.features;
      for (i = 0; i < features.length; i++) {
        if (features[i].attributes["EditStatus"] == "Incomplete") {
          counts.incomplete += 1;
        } else if (features[i].attributes["EditStatus"] == "Complete") {
          counts.complete += 1;
        } else if (features[i].attributes["EditStatus"] == "Locked") {
          counts.locked += 1;
        } else {
          counts.incomplete += 1;
        }
      }
      var pctMapped = Math.round(
        (counts.complete /
          (counts.incomplete + counts.complete + counts.locked)) *
        100
      );
      //   "<h1 class='metrics'>" +
      // blockFeature.attributes["HU100"] +
      // "</h1><span class='metricTitle'>HOUSING UNITS</span>";
      $("#pctMapped").html(
        "<h1 class='metrics'>" +
        pctMapped +
        "%</h1><span class='metricTitle'>COMPLETE</span>" +
        '<div id="progressBar" style="width:' + pctMapped + '%"></div>'

      );
      //$("#progressBar").height($("#pctMapped").height())
      $("#IncompleteCount").html(
        "<h1 class='metrics'>" +
        counts.incomplete +
        "</h1><span class='metricTitle'>INCOMPLETE</span>"
      );
      $("#CompleteCount").html(
        "<h1 class='metrics'>" +
        counts.complete +
        "</h1><span class='metricTitle'>COMPLETE</span>"
      );
      $("#LockedCount").html(
        "<h1 class='metrics'>" +
        counts.locked +
        "</h1><span class='metricTitle'>IN PROGRESS</span>"
      );
    });
    var logQuery = blockLayer.createQuery();
    logQuery.returnGeometry = false;
    logQuery.where = "EditStatus = 'Complete'";
    logQuery.num = 10;
    logQuery.orderByFields = ["MarkedCompleteOn DESC"];
    blockLayer.queryFeatures(logQuery).then(function (qResponse) {
      $("#completeBlockTable").empty();
      var qFeatures = qResponse.features;
      for (j = 0; j < qFeatures.length; j++) {
        var qFeature = qFeatures[j];
        var qBlockID = qFeature.attributes["MapathonBlockID"];
        $("#completeBlockTable").append("<tr><td><a href='javascript:zoomBlockID(" + qBlockID + ");'>" + qBlockID + "</a> completed by " + qFeature.attributes[
          "MarkedCompleteBy"].replace("@redlands.edu_univredlands", "") + "</td></tr>");
      }
    });
    loadOppsStats();
  };

  function selectBlock(blockID) {
    view.graphics.removeAll();
    focusBlockID = blockID;
    var query = blockLayer.createQuery();
    (query.where = "MapathonBlockID = " + focusBlockID),
    (query.returnGeometry = true);

    blockLayer.queryFeatures(query).then(function (response) {
      if (response.features.length > 0) {
        blockFeature = response.features[0];
        let graphic = new Graphic({
          geometry: blockFeature.geometry,
          symbol: {
            type: "simple-fill",

            style: "none",
            outline: {
              // autocasts as new SimpleLineSymbol()
              width: 5,
              color: "yellow",
            },
          },
        });
        view.graphics.add(graphic);

        updateInfoPanel();
        loadConditionInfo();
        //showInfoPanel();
        // blockLayer.visible = false;
        // statusLayer.visible = false;
        changePage("blockPage");
        view.goTo(blockFeature);
      }
    });
  }
  init = function () {
    modal = $("#myModal");
    isEditMode = false;
    document.getElementById("streetView").onclick = function () {
      openStreetView();
    };
    document.getElementById("tabCondition").onclick = function () {
      changeTab("tabCondition");
    };
    document.getElementById("tabOpportunities").onclick = function () {
      changeTab("tabOpportunities");
    };
    document.getElementById("zoomBlock").onclick = function () {
      zoomBlock();
    };
    document.getElementById("editBlock").onclick = function () {
      esriId.getCredential(authInfo.portalUrl + "/sharing");
      toggleEdit();
    };
    document.getElementById("btnComplete").onclick = function () {
      if (hasConditionEdits && $("#chkSaveEdits").prop("checked") == true) {
        submitConditionForm();
      } else {
        loadConditionInfo();
      }
      handleStatusChange("Complete");
      logEdit("Marked Complete");
      modal.hide();
    };
    document.getElementById("btnIncomplete").onclick = function () {
      if (hasConditionEdits && $("#chkSaveEdits").prop("checked") == true) {
        submitConditionForm();
      } else {
        loadConditionInfo();
      }
      handleStatusChange("Incomplete");
      logEdit("Marked Incomplete");
      modal.hide();
    };
    document.getElementById("btnCancelSurvey").onclick = function () {
      hasConditionEdits = false;
      handleStatusChange("Incomplete");
      loadConditionInfo();
      toggleEdit(true);
    };
    document.getElementById("btnSaveSurvey").onclick = function () {
      submitConditionForm();
    };
    // document.getElementById("cancelEdit").onclick = function () {
    //   cancelEdit();
    // };
    document.getElementById("formSurvey").oninput = function () {
      hasConditionEdits = true;
      SaveActivity();
    };
    document.getElementById("closeButton").onclick = function () {
      //hideInfoPanel();
      blockID = null;
      if (isEditMode) {
        showMarkStatus();
      }

      updateStatus();
      changePage("statusPage");
      view.graphics.removeAll();
      if (blockLayer) {
        blockLayer.visible = true;
      }
      if (statusLayer) {
        statusLayer.visible = true;
      }
    };
    // $("#txtOpp").click(function() {

    //   $("#selectType").toggle();
    // });
    layoutPage();
    setInterval(function () {
      console.log("Updating status...");
      blockLayer.refresh();
      statusLayer.refresh();
      updateStatus();
    }, 30000);
  };

  init();

  function logEdit(editType) {
    let logEntry = new Graphic();
    logEntry.attributes = {
      "Editor": username.replace("@redlands.edu_univredlands",""),
      "EditDate": Date.now(),
      "BlockID": focusBlockID,
      "EditType": editType
    }
    editLog
      .applyEdits({
        addFeatures: [logEntry]
      })
  }

  function SaveActivity() {
    let activityInfo = new Graphic();
    activityInfo.attributes = {
      OBJECTID: blockFeature.attributes["OBJECTID"],
      LastActivity: Date.now()
    }
    blockLayer
      .applyEdits({
        updateFeatures: [activityInfo],
      })


  }

  function submitConditionForm() {
    $("#btnSaveSurvey").attr("disabled", true);
    $("#btnSaveSurvey").text("Saving...");
    let blockInfo = new Graphic();
    blockInfo.attributes = {
      OBJECTID: blockFeature.attributes["OBJECTID"],
    };
    if (
      blockFeature.attributes["survey_EditorInfo"] &&
      blockFeature.attributes["survey_EditorInfo"] != ""
    ) {
      blockFeature.attributes["survey_EditorInfo"] =
        blockFeature.attributes["survey_EditorInfo"] +
        ",{username:" +
        username.replace("@redlands.edu_univredlands", "") +
        ",editdate:" +
        Date.now() +
        "}";
    } else {
      blockInfo.attributes["survey_EditorInfo"] =
        "{username:" + username.replace("@redlands.edu_univredlands", "") + ",editdate:" + Date.now() + "}";
    }
    if ($("#selLanduse").val() != "0") {
      blockInfo.attributes["survey_LandUse"] = $("#selLanduse").val();
    }
    if ($("#chkVacantLots").prop("checked")) {
      blockInfo.attributes["survey_VacantLots"] = 1;
    } else {
      blockInfo.attributes["survey_VacantLots"] = 0;
    }
    if ($("#selTrees").val() != "0") {
      blockInfo.attributes["survey_TreeCover"] = $("#selTrees").val();
    }
    if ($("#selLand").val() != "0") {
      blockInfo.attributes["survey_LandCover"] = $("#selLand").val();
    }
    if ($("#selSidewalk").val() != "0") {
      blockInfo.attributes["survey_SidewalkCondition"] =
        $("#selSidewalk").val();
    }
    if ($("#chkMissingSidewalks").prop("checked")) {
      blockInfo.attributes["survey_MissingSidewalks"] = 1;
    } else {
      blockInfo.attributes["survey_MissingSidewalks"] = 0;
    }

    if ($("#chkMissingADA").prop("checked")) {
      blockInfo.attributes["survey_MissingADA"] = 1;
    } else {
      blockInfo.attributes["survey_MissingADA"] = 0;
    }

    if ($("#selTransport").val() != "0") {
      blockInfo.attributes["survey_SchoolTransportation"] =
        $("#selTransport").val();
    }
    if ($("#selSafety").val() != "0") {
      blockInfo.attributes["survey_SafeSchoolRoutes"] = $("#selSafety").val();
    }
    if ($("#solarCount").val() != "") {
      blockInfo.attributes["survey_SolarBuildings"] = parseInt(
        $("#solarCount").val()
      );
    }
    if ($("#txtNotes").val() != "") {
      blockInfo.attributes["survey_Notes"] = $("#txtNotes").val();
    }
    updateConditionInfo(blockInfo);
    logEdit("Condition update");
  }
  $(window).resize(function () {
    layoutPage();
  });

  unselectFeature = function () {
    if (highlight) {
      highlight.remove();
    }
  };

  updateConditionInfo = function (blockCondition) {
    blockLayer
      .applyEdits({
        updateFeatures: [blockCondition],
      })
      .then((results) => {
        console.log("Saved");
        hasConditionEdits = false;
        $("#btnSaveSurvey").text("Saved!");
        setTimeout(function () {
          $("#btnSaveSurvey").text("Save");
          $("#btnSaveSurvey").attr("disabled", false);
        }, 1500);
        //$("#btnSaveSurvey").attr("disabled",false);
        //alertify.success("Condition info saved!");
        // statusLayer.refresh();
        // blockLayer.refresh();
        // blockFeature.attributes["EditStatus"] = status;
        // if (status != "Locked") {
        //   isEditMode = false;
        //   updateStatus();
        //   updateInfoPanel();
        // }
      });
  };
  handleStatusChange = function (status) {
    let blockUpdate = new Graphic();

    blockUpdate.attributes = {
      OBJECTID: blockFeature.attributes["OBJECTID"],
      EditStatus: status,
    };
    if (status == "Complete") {
      blockUpdate.attributes["MarkedCompleteOn"] = Date.now();
      blockUpdate.attributes["MarkedCompleteBy"] = username.replace("@redlands.edu_univredlands", "");
      blockFeature.attributes["MarkedCompleteOn"] = Date.now();
      blockFeature.attributes["MarkedCompleteBy"] = username.replace("@redlands.edu_univredlands", "");
    } else if (status == "Locked") {
      blockUpdate.attributes["LockTime"] = Date.now();
      blockUpdate.attributes["LockedBy"] = username.replace("@redlands.edu_univredlands", "");
      blockFeature.attributes["LockTime"] = Date.now();
      blockFeature.attributes["LockedBy"] = username.replace("@redlands.edu_univredlands", "");
    }



    blockLayer
      .applyEdits({
        updateFeatures: [blockUpdate],
      })
      .then((results) => {
        statusLayer.refresh();
        blockLayer.refresh();
        setTimeout(function () {
          statusLayer.refresh();
          blockLayer.refresh();
        }, 2000);
        blockFeature.attributes["EditStatus"] = status;
        if (status != "Locked") {
          isEditMode = false;
          updateStatus();
          updateInfoPanel();
        }
      });
  };

  function loadConditionInfo() {
    if (blockFeature.attributes["survey_LandUse"]) {
      $("#selLanduse").val(blockFeature.attributes["survey_LandUse"]);
    } else {
      $("#selLanduse").val("0");
    }
    if (blockFeature.attributes["survey_VacantLots"]) {
      $("#chkVacantLots").prop(
        "checked",
        blockFeature.attributes["survey_VacantLots"] === 1
      );
    } else {
      $("#chkVacantLots").prop("checked", false);
    }
    if (blockFeature.attributes["survey_TreeCover"]) {
      $("#selTrees").val(blockFeature.attributes["survey_TreeCover"]);
    } else {
      $("#selTrees").val("0");
    }
    if (blockFeature.attributes["survey_LandCover"]) {
      $("#selLand").val(blockFeature.attributes["survey_LandCover"]);
    } else {
      $("#selLand").val("0");
    }
    if (blockFeature.attributes["survey_SidewalkCondition"]) {
      $("#selSidewalk").val(
        blockFeature.attributes["survey_SidewalkCondition"]
      );
    } else {
      $("#selSidewalk").val("0");
    }
    if (blockFeature.attributes["survey_MissingSidewalks"]) {
      $("#chkMissingSidewalks").prop(
        "checked",
        blockFeature.attributes["survey_MissingSidewalks"] === 1
      );
    } else {
      $("#chkMissingSidewalks").prop("checked", false);
    }
    if (blockFeature.attributes["survey_MissingADA"]) {
      $("#chkMissingADA").prop(
        "checked",
        blockFeature.attributes["survey_MissingADA"] === 1
      );
    } else {
      $("#chkMissingADA").prop("checked", false);
    }
    if (blockFeature.attributes["survey_SchoolTransportation"]) {
      $("#selTransport").val(
        blockFeature.attributes["survey_SchoolTransportation"]
      );
    } else {
      $("#selTransport").val("0");
    }
    if (blockFeature.attributes["survey_SafeSchoolRoutes"]) {
      $("#selSafety").val(blockFeature.attributes["survey_SafeSchoolRoutes"]);
    } else {
      $("#selSafety").val("0");
    }

    if (blockFeature.attributes["survey_SolarBuildings"]) {
      $("#solarCount").val(blockFeature.attributes["survey_SolarBuildings"]);
    } else {
      $("#solarCount").val("");
    }
    if (blockFeature.attributes["survey_Notes"]) {
      $("#txtNotes").val(blockFeature.attributes["survey_Notes"]);
    } else {
      $("#txtNotes").val("");
    }
    hasConditionEdits = false;
  }
  // Highlights the clicked feature and display
  // the feature form with the incident's attributes.
  function selectOpp(objectId) {
    // query feature from the server
    oppsLayer
      .queryFeatures({
        objectIds: [objectId],
        outFields: ["*"],
        returnGeometry: true,
      })
      .then((results) => {
        if (results.features.length > 0) {
          editFeature = results.features[0];

          // display the attributes of selected feature in the form
          featureForm.feature = editFeature;

          // highlight the feature on the view
          view.whenLayerView(editFeature.layer).then((layerView) => {
            highlight = layerView.highlight(editFeature);
          });
        }
      });
  }

  function setupEditor() {
    const templates = new FeatureTemplates({
      container: "addTemplatesDiv",
      layers: [oppsLayer],
    });
    const notesField = new TextAreaInput({});
    featureForm = new FeatureForm({
      container: "formDiv",
      layer: oppsLayer,
      formTemplate: {
        title: "Opportunity Point",
        elements: [{
            type: "field",
            fieldName: "OppType",
            label: "Type",
          },
          {
            type: "field",
            fieldName: "Notes",
            label: "Notes",
            input: notesField,
          },
        ],
      },
    });

    const addFeatureDiv = document.getElementById("addFeatureDiv");
    const attributeEditing = document.getElementById("featureUpdateDiv");

    // Controls visibility of addFeature or attributeEditing divs
    featureForm.on("submit", () => {
      if (editFeature) {
        // Grab updated attributes from the form.
        const updated = featureForm.getValues();

        // Loop through updated attributes and assign
        // the updated values to feature attributes.
        Object.keys(updated).forEach((name) => {
          editFeature.attributes[name] = updated[name];
        });

        // Setup the applyEdits parameter with updates.
        const edits = {
          updateFeatures: [editFeature],
        };
        applyEditsToOpps(edits);
        logEdit("Edited point attributes - " + attributes.OppType);
        document.getElementById("viewDiv").style.cursor = "auto";
      }
    });

    function toggleEditingDivs(addDiv, attributesDiv) {
      $("#addFeatureDiv").toggle();
      $("#featureUpdateDiv").toggle();
      $("#updateInstructionDiv").toggle();
      // addFeatureDiv.style.display = addDiv;
      // attributeEditing.style.display = attributesDiv;

      // document.getElementById("updateInstructionDiv").style.display =
      //   addDiv;
    }
    document.getElementById("btnUpdate").onclick = () => {
      // Fires feature form's submit event.
      featureForm.submit();
    };

    // Delete the selected feature. ApplyEdits is called
    // with the selected feature to be deleted.
    document.getElementById("btnDelete").onclick = () => {
      // setup the applyEdits parameter with deletes.
      const edits = {
        deleteFeatures: [editFeature],
      };
      applyEditsToOpps(edits);
      logEdit("Deleted point - " + attributes.OppType);
      document.getElementById("viewDiv").style.cursor = "auto";
    };

    function selectFeature(objectId) {
      // query feature from the server
      oppsLayer
        .queryFeatures({
          objectIds: [objectId],
          outFields: ["*"],
          returnGeometry: true,
        })
        .then((results) => {
          if (results.features.length > 0) {
            editFeature = results.features[0];

            // display the attributes of selected feature in the form
            featureForm.feature = editFeature;
            changeTab("tabOpportunities");
            // highlight the feature on the view
            view.whenLayerView(editFeature.layer).then((layerView) => {
              highlight = layerView.highlight(editFeature);
            });
          }
        });
    }

    function selectExistingFeature() {
      view.on("click", (event) => {

        if (isEditMode == false) {
          return;
        }
        // clear previous feature selection
        unselectFeature();
        if (document.getElementById("mapView").style.cursor != "crosshair") {
          view.hitTest(event).then((response) => {
            // If a user clicks on an incident feature, select the feature.
            if (response.results.length === 0) {
              toggleEditingDivs("block", "none");
            } else if (
              response.results[0].graphic &&
              response.results[0].graphic.layer.title == "ANCA Opportunities"
            ) {
              if (addFeatureDiv.style.display === "block") {
                toggleEditingDivs("none", "block");
              }
              selectFeature(
                response.results[0].graphic.attributes[oppsLayer.objectIdField]
              );
            }
          });
        }
      });
    }
    selectExistingFeature();
    toggleEdit = function (cancel = false) {
      if (isEditMode) {
        if (cancel == false) {
          showMarkStatus();
        }

        // if (hasConditionEdits) {
        //   showMarkStatus();
        // } else {

        // }

        isEditMode = false;
        $("#blockSurvey :input").attr("disabled", true);
        $("#editBlock").text("Edit");
        $("#cancelEdit").hide();
        $(".tabBar").hide();
        changeTab("tabCondition");
        statusLayer.visible = true;
        blockLayer.visible = true;
        unselectFeature();
        oppsLayer.popupEnabled = true;
        updateInfoPanel();
      } else {
        isEditMode = true;
        handleStatusChange("Locked");
        logEdit("Started Editing");
        SaveActivity();
        $("#blockSurvey :input").attr("disabled", false);
        $("#editBlock").text("Done");
        // $("#cancelEdit").show();
        $(".tabBar").show();
        statusLayer.visible = false;
        blockLayer.visible = false;
        oppsLayer.popupEnabled = false;
        //view.popup.visible = false;
        $("#editBlock").removeClass("button-complete");
        $("#editBlock").removeClass("button-locked");
        $("#editBlock").prop("disabled", false);
      }
      layoutPage();
    };

    function applyEditsToOpps(params) {
      oppsLayer
        .applyEdits(params)
        .then((editsResult) => {
          // Get the objectId of the newly added feature.
          // Call selectFeature function to highlight the new feature.
          SaveActivity();
          if (
            editsResult.addFeatureResults.length > 0 ||
            editsResult.updateFeatureResults.length > 0
          ) {
            unselectFeature();
            let objectId;
            if (editsResult.addFeatureResults.length > 0) {
              objectId = editsResult.addFeatureResults[0].objectId;
            } else {
              featureForm.feature = null;
              objectId = editsResult.updateFeatureResults[0].objectId;
            }
            selectFeature(objectId);
            if (addFeatureDiv.style.display === "block") {
              toggleEditingDivs("none", "block");
            } else if (addFeatureDiv.style.display === "none") {
              toggleEditingDivs("block", "none");
            }
          }
          // show FeatureTemplates if user deleted a feature
          else if (editsResult.deleteFeatureResults.length > 0) {
            toggleEditingDivs("block", "none");
          }
        })
        .catch((error) => {
          console.log("error = ", error);
        });
    }
    templates.on("select", (evtTemplate) => {
      // Access the template item's attributes from the event's
      // template prototype.
      attributes = evtTemplate.template.prototype.attributes;
      unselectFeature();
      document.getElementById("mapView").style.cursor = "crosshair";

      // With the selected template item, listen for the view's click event and create feature
      const handler = view.on("click", (event) => {
        // remove click event handler once user clicks on the view
        // to create a new feature
        handler.remove();
        event.stopPropagation();
        featureForm.feature = null;

        if (event.mapPoint) {
          point = event.mapPoint.clone();
          point.z = undefined;
          point.hasZ = false;

          // Create a new feature using one of the selected
          // template items.
          editFeature = new Graphic({
            geometry: point,
            attributes: {
              OppType: attributes.OppType,
              Notes: attributes.Notes,
              BlockID: focusBlockID,
            },
          });

          // Setup the applyEdits parameter with adds.
          const edits = {
            addFeatures: [editFeature],
          };
          applyEditsToOpps(edits);
          logEdit("Added point - " + attributes.OppType);
          document.getElementById("mapView").style.cursor = "auto";
        } else {
          console.error("event.mapPoint is not defined");
        }
      });
    });
  }
});

function layoutPage() {
  $("#infoPanel").css("top", $("#mapView").css("top"));

  $("#infoPanel").css("bottom", $("#mapView").css("bottom"));
  // $("#blockSurvey").height(
  // $(".tabContent").css("bottom", $("#mapView").css("bottom"));

  if (isEditMode) {
    $("#surveySave").show();
    $("#blockSurvey").css(
      "height",
      $("#surveySave").position().top -
      $("#blockSurvey").position().top -
      $("#surveySave").height() -
      13
    );
    $("#editOpps").height($("#blockSurvey").height());
  } else {
    $("#surveySave").hide();
    $("#blockSurvey").css(
      "height",
      $(document).height() - $("#blockSurvey").position().top - 53
    );
    $("#blockSurvey :input").attr("disabled", true);
  }
}

function changeTab(name) {
  $(".tabButton").removeClass("activeTab");
  $("#" + name).addClass("activeTab");
  if (name == "tabCondition") {
    $("#surveyTab").show();
    $("#editOpps").hide();
  } else if (name === "tabOpportunities") {
    $("#surveyTab").hide();
    $("#editOpps").show();
  }
}

function updateInfoPanel() {
  document.getElementById("infoBlockID").innerText = focusBlockID;
  document.getElementById("infoPop").innerHTML =
    "<h1 class='metrics'>" +
    blockFeature.attributes["POP100"] +
    "</h1><span class='metricTitle'>PEOPLE</span>";
  document.getElementById("infoHousing").innerHTML =
    "<h1 class='metrics'>" +
    blockFeature.attributes["HU100"] +
    "</h1><span class='metricTitle'>HOUSING UNITS</span>";
  document.getElementById("infoHinc").innerHTML =
    "<h1 class='metrics'>" +
    currency.format(blockFeature.attributes["ThematicValue"]) +
    "</h1><span class='metricTitle'>MEDIAN HOUSEHOLD INCOME</span>";
  document.getElementById("infoPoverty").innerHTML =
    "<h1 class='metrics'>" +
    blockFeature.attributes["Poverty_2020"] +
    "</h1><span class='metricTitle'>HOUSEHOLDS IN POVERTY</span>";
  document.getElementById("infoElem").innerHTML =
    "<h1 class='metrics'>" +
    blockFeature.attributes["ElementarySchool"] +
    "</h1><span class='metricTitle'>ELEMENTARY SCHOOL</span>";
  document.getElementById("infoKids").innerHTML =
    "<h1 class='metrics'>" +
    blockFeature.attributes["PopUnder18"] +
    "</h1><span class='metricTitle'>KIDS UNDER 18</span>";
  // document.getElementById("infoPop").innerHTML = "<b>Population</b><br/>" + blockFeature.attributes["POP100"];
  if (blockFeature.attributes["EditStatus"] == "Complete") {
    $("#editBlock").text("Mark as incomplete and start editing");
    $("#editBlock").addClass("button-complete");
    $("#editBlock").removeClass("button-locked");
    $("#editBlock").prop("disabled", false);
    $("#blockSurvey :input").attr("disabled", true);
    $("#editHistory").text("Marked complete");
    if (
      blockFeature.attributes["MarkedCompleteBy"] &&
      blockFeature.attributes["MarkedCompleteBy"] != ""
    ) {
      $("#editHistory").text(
        $("#editHistory").text() +
        " by " +
        blockFeature.attributes["MarkedCompleteBy"].replace("@redlands.edu_univredlands", "")
      );
    }
    if (blockFeature.attributes["MarkedCompleteOn"]) {
      var completeDate = new Date(
        blockFeature.attributes["MarkedCompleteOn"]
      ).toLocaleString("en-US", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      completeDate = completeDate.replace(",", " at ");
      $("#editHistory").text($("#editHistory").text() + " on " + completeDate);
    }
  } else if (blockFeature.attributes["EditStatus"] == "Locked") {
    $("#editBlock").text("Block currently locked");
    $("#editBlock").addClass("button-locked");
    $("#editBlock").removeClass("button-complete");
    $("#editBlock").prop("disabled", true);
    // isEditMode = false;
    $("#blockSurvey :input").attr("disabled", true);

    $("#editHistory").text("Locked");
    if (
      blockFeature.attributes["LockedBy"] &&
      blockFeature.attributes["LockTime"] != ""
    ) {
      $("#editHistory").text(
        $("#editHistory").text() + " by " + blockFeature.attributes["LockedBy"]
      );
    }
    if (blockFeature.attributes["LockTime"]) {
      var lockedDate = new Date(
        blockFeature.attributes["LockTime"]
      ).toLocaleString("en-US", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      lockedDate = lockedDate.replace(",", " at ");
      $("#editHistory").text($("#editHistory").text() + " on " + lockedDate);
    }
  } else {
    $("#editHistory").text("");
    $("#editBlock").text("Edit block");
    $("#editBlock").removeClass("button-complete");
    $("#editBlock").removeClass("button-locked");
    $("#editBlock").prop("disabled", false);
  }

  layoutPage();
}

function getUrlParameter(sParam) {
  var sPageURL = decodeURIComponent(window.location.search.substring(1)),
    sURLVariables = sPageURL.split("&"),
    sParameterName,
    i;

  for (var i = 0; i < sURLVariables.length; i++) {
    sParameterName = sURLVariables[i].split("=");

    if (sParameterName[0].toLowerCase() === sParam.toLowerCase()) {
      return sParameterName[1] === undefined ? true : sParameterName[1];
    }
  }
  return;
}

function showMarkStatus() {
  if (hasConditionEdits) {
    $("#chkSaveEdits").prop("checked", true);
    $("#lblSaveEdits").show();
  } else {
    $("#lblSaveEdits").hide();
  }
  modal.show();
}

function cancelEdit() {
  toggleEdit();
}

function showInfoPanel() {
  document.getElementById("infoPanel").classList.add("slideout");
  document.getElementById("mapView").classList.add("info");

  layoutPage();
  $("#help").hide();
  //view.goTo(blockFeature);
}

function hideInfoPanel() {
  document.getElementById("infoPanel").classList.remove("slideout");
  document.getElementById("mapView").classList.remove("info");
  $("#help").show();
  view.graphics.removeAll();
  if (blockLayer) {
    blockLayer.visible = true;
  }
  if (statusLayer) {
    statusLayer.visible = true;
  }
}

function changePage(divName) {
  $(".infoPanelPage").hide();
  $("#" + divName).show();
  // if (divName == "blockPage"){
  //   blockLayer.visible = false;
  // }
}
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
  // These options are needed to round to whole numbers if that's what you want.
  //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
  //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
});
window.addEventListener("resize", function (event) {});