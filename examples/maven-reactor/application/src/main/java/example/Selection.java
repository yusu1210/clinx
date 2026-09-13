package example;

import java.util.List;

public final class Selection {
    private Selection() {}

    public record Item(boolean active, int stock) {}

    public static long count(List<Item> items) {
        return items.stream()
                .filter(item -> Eligibility.eligible(item.active(), item.stock()))
                .count();
    }
}
