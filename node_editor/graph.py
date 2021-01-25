import inspect
import json
from inspect import _empty, getsource, signature
from types import FunctionType
from typing import Callable, Dict

import typing_utils
from IPython.display import JSON, display


class Node(dict):
    function: FunctionType
    type_map: Dict[str, type]

    def __init__(self, inputs, outputs, fun, type_map):
        super(Node, self).__init__(
            inputs=inputs,
            outputs=outputs,
            name=fun.__name__,
            source=getsource(fun),
        )
        self.function = fun
        self.type_map = type_map

    def __call__(self, *args, **kwargs):
        return self.function(*args, **kwargs)

    def __repr__(self):
        data = super(Node, self).__repr__()
        return f"<Node: {data}>"

    def _ipython_display_(self):
        return display(JSON(self))


class NodeRegistry:
    nodes: Dict[str, Node]

    def __init__(self):
        self.nodes = {}

    def register(self, fun: Callable):
        # Extract signature
        sig = signature(fun)

        type_map = {}
        inputs = {}
        for pname, p in sig.parameters.items():
            tp = typing_utils.normalize(p.annotation)
            # Mandatory
            if (p.kind == inspect.Parameter.POSITIONAL_OR_KEYWORD) and (
                p.default == _empty
            ):
                optional = False
            else:
                optional = True
            inputs[pname] = {"type": str(tp), "optional": optional}
            type_map[str(tp)] = p.annotation

        tp = typing_utils.normalize(sig.return_annotation)
        if sig.return_annotation != _empty:
            outputs = {"output": {"type": str(tp), "optional": False}}
            type_map[str(tp)] = sig.return_annotation
        else:
            outputs = {}

        self.nodes[fun.__name__] = Node(inputs, outputs, fun, type_map)
        return fun

    def get_nodes(self) -> Dict[str, Node]:
        return self.nodes

    def get_nodes_as_json(self) -> str:
        return json.dumps(self.get_nodes())

    @staticmethod
    def _resolve_parent(
        t1_str: str, t2_str: str, types: Dict[str, type], parent_types: Dict[str, str]
    ) -> bool:
        t1 = types[t1_str]
        t2 = types[t2_str]
        # Check whether t1 is a subtype of t2
        if not typing_utils.issubtype(t1, t2):
            return False

        while t2_str in parent_types:
            t2_str = parent_types[t2_str]

        parent_types[t1_str] = t2_str
        return True

    def get_parent_types(self) -> Dict[str, str]:
        type_map: Dict[str, type] = {}
        parent_types: Dict[str, str] = {}

        for node in self.nodes.values():
            type_map.update(node.type_map)

        type_str = [t for t in type_map.keys() if t != "typing.Any"]

        for i1, t1_str in enumerate(type_str):
            for t2_str in type_str[i1 + 1 :]:
                if not self._resolve_parent(t1_str, t2_str, type_map, parent_types):
                    self._resolve_parent(t2_str, t1_str, type_map, parent_types)
        return parent_types

    def get_parent_types_as_json(self) -> str:
        return json.dumps(self.get_parent_types())

registry = NodeRegistry()


def register_node(fun: FunctionType):
    return registry.register(fun)
