package example;

import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class SelectionTest {
    @Test
    void delegatesToSharedPolicy() {
        var items = List.of(
                new Selection.Item(true, 1),
                new Selection.Item(false, 1),
                new Selection.Item(true, 0));
        assertEquals(1, Selection.count(items));
    }
}
