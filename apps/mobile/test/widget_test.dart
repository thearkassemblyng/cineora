import 'package:flutter_test/flutter_test.dart';
import 'package:cineora_mobile/main.dart';

void main() {
  testWidgets('renders CINEORA studio navigation and header', (WidgetTester tester) async {
    await tester.pumpWidget(const CineoraMobileApp());
    expect(find.text('CINEORA'), findsOneWidget);
    expect(find.text('Studio'), findsOneWidget);
    expect(find.text('Quality Tiers'), findsOneWidget);
  });
}
