"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onNodeMenu = void 0;
function onNodeMenu(nodeInfo) {
    const menu = [];
    if (nodeInfo.type === "cc.Node") {
        menu.push({
            label: "复制相对路径",
            async click() {
                var _a;
                var node = await Editor.Message.request('scene', 'query-node', nodeInfo.uuid);
                var parentNode = await Editor.Message.request('scene', 'query-node', nodeInfo.parent);
                let path = node.name.value;
                while (((_a = parentNode.parent) === null || _a === void 0 ? void 0 : _a.value) != null) {
                    node = parentNode;
                    parentNode = await Editor.Message.request('scene', 'query-node', parentNode.parent.value.uuid);
                    if (parentNode == null || parentNode.name.value == "should_hide_in_hierarchy")
                        break;
                    path = node.name.value + "/" + path;
                }
                console.log(path);
                Editor.Clipboard.write('text', path);
            }
        });
    }
    ;
    return menu;
}
exports.onNodeMenu = onNodeMenu;
;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGllcmFyY2h5LWVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9oaWVyYXJjaHktZWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLFNBQWdCLFVBQVUsQ0FBQyxRQUFZO0lBQ3BDLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUNoQixJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO1FBQzVCLElBQUksQ0FBQyxJQUFJLENBQ1Q7WUFDSSxLQUFLLEVBQUUsUUFBUTtZQUNmLEtBQUssQ0FBQyxLQUFLOztnQkFDUCxJQUFJLElBQUksR0FBRyxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUM5RSxJQUFJLFVBQVUsR0FBRyxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN0RixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztnQkFDM0IsT0FBTSxDQUFBLE1BQUEsVUFBVSxDQUFDLE1BQU0sMENBQUUsS0FBSyxLQUFJLElBQUksRUFBQztvQkFDbkMsSUFBSSxHQUFHLFVBQVUsQ0FBQztvQkFDbEIsVUFBVSxHQUFHLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDL0YsSUFBRyxVQUFVLElBQUksSUFBSSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLDBCQUEwQjt3QkFBRSxNQUFNO29CQUNwRixJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQztpQkFDdkM7Z0JBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDakIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3pDLENBQUM7U0FDSixDQUFDLENBQUE7S0FDTDtJQUFBLENBQUM7SUFDRixPQUFPLElBQUksQ0FBQztBQUNoQixDQUFDO0FBdEJELGdDQXNCQztBQUFBLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBc3NldEluZm8gfSBmcm9tIFwiQGNvY29zL2NyZWF0b3ItdHlwZXMvZWRpdG9yL3BhY2thZ2VzL2Fzc2V0LWRiL0B0eXBlcy9wdWJsaWNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBvbk5vZGVNZW51KG5vZGVJbmZvOmFueSkge1xyXG4gICBjb25zdCBtZW51ID0gW107XHJcbiAgIGlmIChub2RlSW5mby50eXBlID09PSBcImNjLk5vZGVcIikge1xyXG4gICAgICAgIG1lbnUucHVzaChcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGxhYmVsOiBcIuWkjeWItuebuOWvuei3r+W+hFwiLFxyXG4gICAgICAgICAgICBhc3luYyBjbGljaygpIHtcclxuICAgICAgICAgICAgICAgIHZhciBub2RlID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVJbmZvLnV1aWQpO1xyXG4gICAgICAgICAgICAgICAgdmFyIHBhcmVudE5vZGUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZUluZm8ucGFyZW50KTtcclxuICAgICAgICAgICAgICAgIGxldCBwYXRoID0gbm9kZS5uYW1lLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgd2hpbGUocGFyZW50Tm9kZS5wYXJlbnQ/LnZhbHVlICE9IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGUgPSBwYXJlbnROb2RlO1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudE5vZGUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgcGFyZW50Tm9kZS5wYXJlbnQudmFsdWUudXVpZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYocGFyZW50Tm9kZSA9PSBudWxsIHx8IHBhcmVudE5vZGUubmFtZS52YWx1ZSA9PSBcInNob3VsZF9oaWRlX2luX2hpZXJhcmNoeVwiKSBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBwYXRoID0gbm9kZS5uYW1lLnZhbHVlICsgXCIvXCIgKyBwYXRoO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cocGF0aClcclxuICAgICAgICAgICAgICAgIEVkaXRvci5DbGlwYm9hcmQud3JpdGUoJ3RleHQnLCBwYXRoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIG1lbnU7XHJcbn07Il19