var webmap,
  map,
  view,
  locateBtn,
  poiLayer,
  basemapLayer,
  imageryLayer,
  labelLayer,
  poiView,
  searchWidget,
  locator,
  viewLegend,
  modal,
  categories,
  otherFeatureOids,
  allSymbols,
  directionsAction,
  permalinkAction,
  init,
  pinLayers;
const mapid = "b2febd2e82ff4323a03c97cefae6db61";
const poiLayerName = "POI for Search";
const visibleGroup = "POI Group Layers";
const unpublishedGroupName = "Unpublished"
const labelLayerName = "Labels";
const basemapLayerName = "Basemap";
const ImageryLayerName = "Imagery";
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
window.onload = function () {
  alertify.set("notifier", "position", "top-center");
  layoutPage();
};
require([
  "esri/views/MapView",
  "esri/WebMap",
  "esri/layers/FeatureLayer",
  "esri/Graphic",
  "esri/layers/GraphicsLayer",
  "esri/widgets/Search",
  "esri/core/reactiveUtils",
  "esri/widgets/Locate"
], (
  MapView,
  WebMap,
  FeatureLayer,
  Graphic,
  GraphicsLayer,
  Search,
  reactiveUtils,
  Locate
) => {
  webmap = new WebMap({
    portalItem: {
      id: mapid,
    },
  });
  view = new MapView({
    map: webmap,
    container: "mapView",
    center: [-117.16401, 34.06327],
    zoom: 16,
  });
  let locateWidget = new Locate({
    view: view,   // Attaches the Locate button to the view
  });
  
  view.ui.add(locateWidget, "top-left");

  // const layerPromises = view.map.layers.map(layer => layer.when());
  // Promise.all(layerPromises)
  // .then(() => {
  //     console.log("All layers have finished loading");
  //     // Your code to execute after all layers are loaded
  // })
  // .catch((error) => {
  //     console.error("Error loading layers:", error);
  // });
  view.when(function () {
    handleLayerRendering();
    setupUnpublished();
    setupSearch();

    setupLabelToggle();
    setupBasemapToggle();
    getPinLayers();
    attachAccordionEvents();

    view.popup.visibleElements = {
      actionBar: true,
    };
    view.popup.collapseEnabled = false;
    view.popup.zoomEnabled = false;
    view.popup.dockOptions = {
      buttonEnabled: false,
    };
    directionsAction = {
      title: "Get Directions",
      id: "get-directions",
      icon: "road-sign",
    };

    permalinkAction = {
      title: "Get Link",
      id: "get-link",
      icon: "link",
    };
    view.whenLayerView(poiLayer).then((layerView) => {
      poiView = layerView;
    });
    handleUrlParams();

    setupPopup();
  });
  function handleLayerRendering() {
    for (let i = 0; i < view.map.layers.length; i++) {
      let layer = view.map.layers.items[i];

      if (layer.type === "group" && layer.title === visibleGroup) {
        //pinLayers.push(layer);

        groupLayer = layer;
        if (groupLayer) {
          const layers = groupLayer.layers; // This is a Collection of layers

          const layerPromises = layers.map((layer) => {
            return view.whenLayerView(layer).then(function (layerView) {
              return new Promise((resolve) => {
                // Watch the 'updating' property to detect when rendering is done
                layerView.watch("updating", function (value) {
                  if (!value) {
                    resolve(); // Resolves when layer is done updating
                  }
                });
              });
            });
          });

          // When all layer views have finished updating
          Promise.all(layerPromises).then(function () {
            console.log("All layers have finished loading and rendering");
            $("#loadingOverlay").fadeOut();
            // You can trigger your custom event here
          });

          break;
        } else {
          console.error("Group layer not found");
        }
      }
    }
  }
  var handleOpenPopup = view.watch(
    "popup.visible",
    function (newValue, oldValue, property, object) {
      if (newValue) {
        console.log("opened popup! selected:");
        console.log("watch", view.popup.features); // get the currently selected feature(s)
      } else {
        view.graphics.removeAll();
      }
    }
  );

  function fillPinList(layer) {
    otherFeatureOids = [];
    layer
      .queryFeatures({
        outFields: ["Label,Title,OBJECTID"],
        where:
          layer.definitionExpression +
          " AND (NOT Subcategory ='Subbuilding' or Subcategory is null)",
        returnGeometry: true,
        orderByFields: ["Title Asc"],
      })
      .then((result) => {
        for (i = 0; i < result.features.length; i++) {
          var feat = result.features[i];
          var attr = feat.attributes;
          if (attr.Label == "Brockton Apts: Bldg B") {
            console.log("stop here");
          }

          var catContent = $(".accordionContent[name='" + layer.title + "'");
          if (catContent && result.features[i].visible) {
            console.log("found it");

            var newItem =
              "<div class='pinItem' data-oid='" +
              attr.OBJECTID +
              "' data-long='" +
              feat.geometry.longitude +
              "' data-lat='" +
              feat.geometry.latitude +
              "'>" +
              attr.Title +
              "</div>";
            catContent.append(newItem);
          } else {
            otherFeatureOids.push(attr.ObjectID);
          }
        }
        $(".accordionContent[name='" + layer.title + "'] > .pinItem").click(
          function () {
            collapseLeftPanel();
            view.popup.visible = false;

            view.graphics.removeAll();
            var pt = [$(this).data("long"), $(this).data("lat")];
            view.goTo({
              center: pt,
              zoom: 18,
            });
            layer
              .queryFeatures({
                where: "OBJECTID = " + $(this).data("oid"),
                returnGeometry: true,
                outFields: ["Label,Title,OBJECTID"],
              })
              .then((result) => {
                if (layer.visible == false) {
                  var symb = {
                    type: "picture-marker", // Autocasts as new PictureMarkerSymbol()
                    url: $(".accordionIcon[name='" + layer.title + "']").attr(
                      "src"
                    ), // Replace with your image URL
                    width: "24px",
                    height: "24px",
                  };
                  var tempGraphic = new Graphic({
                    geometry: result.features[0].geometry,
                    symbol: symb,
                  });
                  view.graphics.add(tempGraphic);
                }

                if (result.features.length > 0) {
                  view.popup.open({
                    location: result.features[0].geometry,
                    features: [result.features[0]],
                  });
                  view.popup.zoomEnabled = false;
                  view.popup.visible = true;
                }
              });
          }
        );
      });
  }

  function getPinLayers() {
    // Loop through all the layers in the map
    for (let i = 0; i < view.map.layers.length; i++) {
      layer = view.map.layers.items[i];
      if (layer.type === "group" && layer.title === visibleGroup) {
        groupLayer = layer;
        if (groupLayer) {
          const layers = groupLayer.layers.reverse(); // This is a Collection of layers
          layers.forEach((layer) => {
            console.log(layer.title); // Or any other property of the layer
            addPinGroup(layer);
            fillPinList(layer);
          });
          break;
        } else {
          console.error("Group layer not found");
        }
      }
    }
  }

  function setupPopup() {
    reactiveUtils.on(
      () => view.popup,
      "trigger-action",
      (event) => {
        // Execute the measureThis() function if the measure-this action is clicked
        if (event.action.id === "get-directions") {
          var glink =
            "https://www.google.com/maps/place/" +
            view.popup.selectedFeature.geometry.latitude +
            "," +
            view.popup.selectedFeature.geometry.longitude;
          window.open(glink, "_blank");
          //console.log(view.popup.selectedFeature.geometry);
        } else if (event.action.id === "get-link") {
          var link =
            location.protocol +
            "//" +
            location.host +
            location.pathname +
            "?pinid=" +
            view.popup.selectedFeature.attributes.OBJECTID;
          navigator.clipboard.writeText(link);
          alertify.alert("Permalink copied to clipboard");
          //window.open(link, '_blank');
        }
      }
    );
    var handle = view.watch(
      "popup.visible",
      function (newValue, oldValue, property, object) {
        if (newValue) {
          if (view.popup.actions.length == 0) {
            view.popup.actions.push(directionsAction);
            view.popup.actions.push(permalinkAction);
          }
          //popup.actions.removeAll();

          console.log("opened popup! selected:");
          console.log("watch", view.popup.features); // get the currently selected feature(s)
        }
      }
    );
  }

  function setupBasemapToggle() {
    for (let j = 0; j < view.map.layers.length; j++) {
      layer = view.map.layers.items[j];
      if (layer.title === basemapLayerName) {
        basemapLayer = layer;
        basemapLayer.visible = true;
      } else if (layer.title === ImageryLayerName) {
        imageryLayer = layer;
        imageryLayer.visible = false;
      }
    }
    $(".basemap").click(function () {
      if ($(this).hasClass("base-enabled") == false) {
        $(".basemap").removeClass("base-enabled");
        $(this).addClass("base-enabled");
        if ($(this).attr("id") == "base-imagery") {
          imageryLayer.visible = true;
          basemapLayer.visible = false;
        } else {
          imageryLayer.visible = false;
          basemapLayer.visible = true;
        }
      }
    });
  }

  function setupLabelToggle() {
    for (let j = 0; j < view.map.layers.length; j++) {
      layer = view.map.layers.items[j];
      if (layer.title === labelLayerName) {
        labelLayer = layer;
        $("#labelToggle").prop("checked", layer.visible);
      }
    }
    $("#labelToggle").change(function () {
      labelLayer.visible = $(this).is(":checked");
    });
  }

  function handleUrlParams() {
    var keys = urlParams.keys();
    for (const key of keys) {
      if (key.toLowerCase() == "pinid") {
        var pinid = urlParams.get(key);
        poiLayer
          .queryFeatures({
            outFields: ["Label,Title,OBJECTID"],
            where: "OBJECTID = " + pinid,
            returnGeometry: true,
            orderByFields: ["Title Asc"],
          })
          .then((result) => {
            if (result.features.length > 0) {
              var feat = result.features[0];
              view.popup.open({
                location: feat.geometry,
                features: [feat],
              });
              view.goTo({
                geometry: feat.geometry,
                zoom: 18,
              });
            }
          });
      }
    }
    //clear the parameters from the url
    //window.history.replaceState({},"","/")
  }
function setupUnpublished(){
  for (let i = 0; i < view.map.layers.length; i++) {
    layer = view.map.layers.items[i];
    if (layer.type === "group" && layer.title === unpublishedGroupName) {
      layer.visible = false;
      return;
    }
  }
}
  function setupSearch() {
    for (let j = 0; j < view.map.layers.length; j++) {
      layer = view.map.layers.items[j];
      if (layer.title === poiLayerName) {
        poiLayer = layer;
        const searchWidget = new Search({
          view: view,
          autoNavigate: true,
          includeDefaultSources: false,
          container: "search",
          autoSelect: true,
          suggestionsEnabled: true,
          resultGraphicEnabled: true,
          sources: [
            {
              layer: poiLayer,
              searchFields: ["Label", "Title", "Description"],
              prefix: "%",
              suggestionTemplate: "{Title}",
              exactMatch: false,
              placeholder: "Search",
              zoomScale: 1125,
              resultGraphicEnabled: true,
              resultSymbol: {
                type: "picture-marker",
                url: "/assets/img/uorPin.png",
                height: 24,
                width: 24,
              },
            },
          ],
        });
        searchWidget.on("search-clear", function (event) {
          view.graphics.removeAll();
        });
        searchWidget.on("select-result", function (event) {
          view.graphics.removeAll();
          console.log("The selected search result: ", event);
          var resultSymbol = {
            type: "picture-marker",
            url: "/assets/img/uorPin.png",
            height: 24,
            width: 24,
          };
          var tempGraphic = new Graphic({
            geometry: event.result.feature.geometry,
            symbol: resultSymbol,
          });
          view.graphics.add(tempGraphic);
        });
      }
    }
  }

  function addPinGroup(layer) {
    var title = layer.title;
    var symbol;
    var renderer = layer.renderer;
    if (renderer.type === "simple") {
      symbol = renderer.symbol.url;
    } else if (renderer.type === "unique-value") {
      symbol = renderer.uniqueValueGroups[0].classes[0].symbol.url;
    } else {
      console.log("Haven't handled rendere type - ", renderer.type);
    }
    var accordHTML =
      '<img name="' +
      title +
      '"class="accordionIcon" src="' +
      symbol +
      '"><span class="accordionTitle">' +
      title +
      '</span><label class="check"> <input name="' +
      title +
      '" type="checkbox"';
    if (layer.visible) {
      accordHTML += "checked";
    }
    accordHTML += '><span class="checkmark"></span> </label>';
    var catHeader = document.createElement("div");
    catHeader.setAttribute("name", title);

    catHeader.innerHTML = accordHTML;
    catHeader.classList.add("accordion");
    var content = document.createElement("div");
    content.setAttribute("name", title);
    content.classList.add("accordionContent");
    document.getElementById("leftPanel").appendChild(catHeader);
    document.getElementById("leftPanel").appendChild(content);
  }

  function getCategories(layer) {
    categories = [];
    var catNames = [];
    const uniqueValueGroups = layer.renderer.uniqueValueGroups;
    var groups = uniqueValueGroups.forEach((group) => {
      //console.log("Group:", group.label);

      group.classes.forEach((classInfo) => {
        var catName = classInfo.label.split("/")[0];
        if (catNames.includes(catName)) {
          return;
        }

        var vals = [];
        for (i = 0; i < classInfo.values.length; i++) {
          vals.push(classInfo.values[i].value);
        }
        categories.push({
          name: catName,
          symbol: classInfo.symbol.url,
          values: vals,
        });
        catNames.push(catName);
        //console.log("Class:", classInfo.label, "Symbol:", classInfo.symbol);
      });
    });
    //console.log(categories);
    //fillTypes(categories);
    //fillPins();
    //getPinLayers();
  }
});

function attachAccordionEvents() {
  var acc = document.getElementsByClassName("accordion");
  var i;

  for (i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", function () {
      this.classList.toggle("active");

      var panel = this.nextElementSibling;

      if (panel.style.maxHeight && !(panel.style.maxHeight = 0)) {
        panel.style.maxHeight = null;
      } else {
        panel.style.maxHeight = panel.scrollHeight;
      }
    });
  }
  $(".pinItem").click(function () {});
  $(".check input:checkbox").change(function () {
    for (let i = 0; i < view.map.layers.length; i++) {
      layer = view.map.layers.items[i];
      if (layer.type === "group" && layer.title === visibleGroup) {
        groupLayer = layer;
        if (groupLayer) {
          const layers = groupLayer.layers.reverse(); // This is a Collection of layers
          layers.forEach((layer) => {
            if (layer.title === $(this)[0].name) {
              layer.visible = $(this).is(":checked");
            }
          });
          break;
        } else {
          console.error("Group layer not found");
        }
      }
    }
  });
}

function fillTypes(categories) {
  for (i = 0; i < categories.length; i++) {
    var catHeader = document.createElement("div");
    catHeader.setAttribute("name", categories[i].name);

    catHeader.innerHTML =
      '<img class="accordionIcon" src="' +
      categories[i].symbol +
      '"><span class="accordionTitle">' +
      categories[i].name +
      '</span><label class="check"> <input type="checkbox"><span class="checkmark"></span> </label>';
    catHeader.classList.add("accordion");
    var content = document.createElement("div");
    content.setAttribute("name", categories[i].name);
    content.classList.add("accordionContent");
    document.getElementById("leftPanel").appendChild(catHeader);
    document.getElementById("leftPanel").appendChild(content);
  }
}

function layoutPage() {
  $("#pnlCollapse").click(function () {
    toggleLayerPanel();
  });
}
function toggleLayerPanel() {
  if ($("#pnlCollapse").is(":visible")) {
    if ($("#pnlCollapse").data("state") == "collapsed") {
      expandLeftPanel();
    } else {
      collapseLeftPanel();
    }
  }
}
function collapseLeftPanel() {
  $("#leftPanel").removeClass("expanded");
  $("#pnlCollapse").html(
    '<span style="color:slategray">&#9650;</span> Show Layer Panel <span style="color:slategray">&#9650;</span>'
  );
  $("#pnlCollapse").data("state", "collapsed");
}
function expandLeftPanel() {
    view.popup.visible = false;
  $("#leftPanel").addClass("expanded");
  $("#pnlCollapse").html(
    '<span style="color:slategray">&#9660;</span> Hide Layer Panel <span style="color:slategray">&#9660;</span>'
  );
  $("#pnlCollapse").data("state", "expanded");
}
